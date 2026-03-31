// ============================================================================
// Kontext Server — Narrator Service
// ============================================================================
// Orchestrates narrative generation: load evidence, ground prompt, call LLM,
// verify facts, persist to PostgreSQL.

import type { Pool } from 'pg';
import type { Redis } from 'ioredis';
import { randomBytes } from 'crypto';
import { PromptGrounder, type EvidenceData } from './prompt-grounder.js';
import { FactVerifier } from './fact-verifier.js';
import { LLMClient } from './llm-client.js';
import { getTemplate, type TemplateName } from './template-builder.js';

function generateId(prefix: string): string {
  const ts = Date.now().toString(36).toUpperCase().padStart(10, '0');
  const rand = randomBytes(8).toString('base64url').toUpperCase().slice(0, 12);
  return `${prefix}_${ts}${rand}`;
}

export interface Narrative {
  narrative_id: string;
  org_id: string;
  event_id: string;
  evidence_bundle_id: string;
  template: TemplateName;
  sections: Record<string, string>;
  markdown: string;
  status: string;
  analyst_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_decision: string | null;
  generated_by: string;
  llm_provider: string | null;
  llm_model: string | null;
  llm_tokens_used: number | null;
  generation_time_ms: number | null;
  digest_reference: string;
  chain_index_reference: number;
  bulk_id: string | null;
  created_at: string;
  expires_at: string | null;
}

export interface BulkJob {
  bulk_id: string;
  org_id: string;
  template: TemplateName;
  filters: Record<string, unknown>;
  total_events: number;
  completed_events: number;
  failed_events: number;
  status: string;
  generated_by: string;
  created_at: string;
  completed_at: string | null;
}

const grounder = new PromptGrounder();
const verifier = new FactVerifier();
const llm = new LLMClient();

export class NarratorService {
  /**
   * Generate a narrative for a single event.
   * Returns cached narrative if one exists for the same event_id + template (unless force=true).
   */
  async narrateSingle(
    pool: Pool,
    orgId: string,
    eventId: string,
    template: TemplateName,
    userId: string,
    force = false,
  ): Promise<Narrative> {
    // Check for existing narrative (dedup)
    if (!force) {
      const { rows: existing } = await pool.query<Narrative>(
        `SELECT * FROM narratives WHERE event_id = $1 AND template = $2 AND org_id = $3 ORDER BY created_at DESC LIMIT 1`,
        [eventId, template, orgId],
      );
      if (existing[0]) return existing[0];
    }

    // Load evidence (JOIN verification_events + evidence_bundles)
    const evidence = await this.loadEvidence(pool, orgId, eventId);
    const tmpl = getTemplate(template);
    const narrativeId = generateId('nar');

    // Insert placeholder row with 'generating' status
    await pool.query(
      `INSERT INTO narratives (narrative_id, org_id, event_id, evidence_bundle_id, template, sections, markdown, status, generated_by, digest_reference, chain_index_reference)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'generating', $8, $9, $10)`,
      [narrativeId, orgId, eventId, evidence.evidence_bundle_id, template, '{}', '', userId, evidence.record_hash, evidence.chain_index],
    );

    const startTime = Date.now();

    try {
      // Build grounded prompt
      const { systemPrompt, userPrompt } = grounder.buildPrompt(evidence, tmpl);

      // Call LLM
      const llmResponse = await llm.generate(systemPrompt, userPrompt);
      const generationTimeMs = Date.now() - startTime;

      // Parse sections from markdown
      const sections = this.parseSections(llmResponse.text, tmpl.requiredSections);

      // Run fact verification (non-blocking, results stored for audit)
      const factCheck = verifier.verify(llmResponse.text, evidence);

      // Build full markdown with verification footer
      const markdown = llmResponse.text + (factCheck.ungrounded.length > 0
        ? `\n\n---\n_Fact verification: ${factCheck.grounded.length} grounded claims, ${factCheck.ungrounded.length} ungrounded claims._`
        : `\n\n---\n_Fact verification: ${factCheck.grounded.length} grounded claims. All claims verified._`);

      // Update narrative to 'draft' status
      const { rows } = await pool.query<Narrative>(
        `UPDATE narratives
         SET sections = $1, markdown = $2, status = 'draft',
             llm_provider = $3, llm_model = $4, llm_tokens_used = $5, generation_time_ms = $6
         WHERE narrative_id = $7
         RETURNING *`,
        [JSON.stringify(sections), markdown, llmResponse.provider, llmResponse.model, llmResponse.tokensUsed, generationTimeMs, narrativeId],
      );

      return rows[0]!;
    } catch (err) {
      // Mark as failed
      await pool.query(
        `UPDATE narratives SET status = 'failed', markdown = $1 WHERE narrative_id = $2`,
        [`Generation failed: ${(err as Error).message}`, narrativeId],
      );
      throw err;
    }
  }

  /**
   * Bulk-generate narratives for events matching filters.
   */
  async narrateBulk(
    pool: Pool,
    redis: Redis | null,
    orgId: string,
    filters: Record<string, unknown>,
    template: TemplateName,
    userId: string,
  ): Promise<BulkJob> {
    // Count matching events
    const whereClause = this.buildFilterWhere(filters);
    const { rows: countRows } = await pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM verification_events WHERE org_id = $1 ${whereClause.sql}`,
      [orgId, ...whereClause.params],
    );
    const totalEvents = parseInt(countRows[0]?.count ?? '0', 10);

    if (totalEvents === 0) {
      throw new Error('No events match the provided filters');
    }

    const bulkId = generateId('bulk');

    // Insert bulk job
    await pool.query(
      `INSERT INTO narrative_bulk_jobs (bulk_id, org_id, template, filters, total_events, generated_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [bulkId, orgId, template, JSON.stringify(filters), totalEvents, userId],
    );

    // Start processing in background (non-blocking)
    this.processBulk(pool, redis, bulkId, orgId, filters, template, userId).catch((err) => {
      console.error(`[Narrator] Bulk job ${bulkId} failed:`, (err as Error).message);
    });

    return {
      bulk_id: bulkId,
      org_id: orgId,
      template,
      filters,
      total_events: totalEvents,
      completed_events: 0,
      failed_events: 0,
      status: 'queued',
      generated_by: userId,
      created_at: new Date().toISOString(),
      completed_at: null,
    };
  }

  private async processBulk(
    pool: Pool,
    redis: Redis | null,
    bulkId: string,
    orgId: string,
    filters: Record<string, unknown>,
    template: TemplateName,
    userId: string,
  ): Promise<void> {
    await pool.query(
      `UPDATE narrative_bulk_jobs SET status = 'processing' WHERE bulk_id = $1`,
      [bulkId],
    );

    const whereClause = this.buildFilterWhere(filters);
    const { rows: events } = await pool.query<{ event_id: string }>(
      `SELECT event_id FROM verification_events WHERE org_id = $1 ${whereClause.sql} ORDER BY created_at DESC`,
      [orgId, ...whereClause.params],
    );

    let completed = 0;
    let failed = 0;

    // Process in batches of 10
    const batchSize = 10;
    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map((e) =>
          this.narrateSingle(pool, orgId, e.event_id, template, userId, false).then((n) => {
            // Tag with bulk_id
            return pool.query(
              `UPDATE narratives SET bulk_id = $1 WHERE narrative_id = $2`,
              [bulkId, n.narrative_id],
            );
          }),
        ),
      );

      for (const r of results) {
        if (r.status === 'fulfilled') {
          completed++;
        } else {
          failed++;
        }
      }

      // Update progress in Redis and DB
      const progress = JSON.stringify({ completed, failed, total: events.length });
      if (redis) {
        try {
          await redis.set(`kontext:bulk:${bulkId}`, progress, 'EX', 86400);
        } catch {
          // Redis failure is non-fatal
        }
      }
      await pool.query(
        `UPDATE narrative_bulk_jobs SET completed_events = $1, failed_events = $2 WHERE bulk_id = $3`,
        [completed, failed, bulkId],
      );
    }

    // Finalize
    const finalStatus = failed === events.length ? 'failed' : 'complete';
    await pool.query(
      `UPDATE narrative_bulk_jobs SET status = $1, completed_at = now() WHERE bulk_id = $2`,
      [finalStatus, bulkId],
    );
  }

  private async loadEvidence(pool: Pool, orgId: string, eventId: string): Promise<EvidenceData> {
    const { rows } = await pool.query<Record<string, unknown>>(
      `SELECT
         ve.event_id, ve.status, ve.workflow, ve.agent_id, ve.agent_type, ve.actor_type,
         ve.payment_tx_hash, ve.payment_chain, ve.payment_rail, ve.payment_token,
         ve.payment_amount, ve.payment_currency, ve.payment_usd_equivalent,
         ve.payment_from_address, ve.payment_to_address, ve.payment_destination_country,
         ve.policy_decision, ve.policy_violations, ve.policy_warnings, ve.applied_policy_ids,
         ve.ofac_status, ve.screening_provider, ve.trust_score, ve.trust_band, ve.trust_reasons,
         ve.created_at,
         eb.evidence_bundle_id, eb.intent_hash_algorithm, eb.intent_hash_value,
         eb.authorization_type, eb.authorized, eb.authorizer,
         eb.policy_trace, eb.screening_result, eb.screened_entity, eb.screening_screened_at,
         eb.exec_tx_hash, eb.exec_chain, eb.exec_observed_onchain,
         eb.record_hash, eb.previous_record_hash, eb.chain_index,
         eb.render_headline, eb.render_subheadline, eb.render_risk_label
       FROM verification_events ve
       JOIN evidence_bundles eb ON eb.event_id = ve.event_id
       WHERE ve.event_id = $1 AND ve.org_id = $2`,
      [eventId, orgId],
    );

    const row = rows[0];
    if (!row) {
      throw new Error(`Event ${eventId} not found or not accessible`);
    }

    return {
      event_id: row['event_id'] as string,
      status: row['status'] as string,
      workflow: row['workflow'] as string,
      agent_id: row['agent_id'] as string,
      agent_type: (row['agent_type'] as string | null) ?? null,
      actor_type: row['actor_type'] as string,
      payment_tx_hash: (row['payment_tx_hash'] as string | null) ?? null,
      payment_chain: row['payment_chain'] as string,
      payment_rail: row['payment_rail'] as string,
      payment_token: row['payment_token'] as string,
      payment_amount: row['payment_amount'] as string,
      payment_currency: row['payment_currency'] as string,
      payment_usd_equivalent: row['payment_usd_equivalent'] as string,
      payment_from_address: row['payment_from_address'] as string,
      payment_to_address: row['payment_to_address'] as string,
      payment_destination_country: (row['payment_destination_country'] as string | null) ?? null,
      policy_decision: row['policy_decision'] as string,
      policy_violations: (row['policy_violations'] as string[]) ?? [],
      policy_warnings: (row['policy_warnings'] as string[]) ?? [],
      applied_policy_ids: (row['applied_policy_ids'] as string[]) ?? [],
      ofac_status: row['ofac_status'] as string,
      screening_provider: (row['screening_provider'] as string | null) ?? null,
      trust_score: row['trust_score'] as number,
      trust_band: row['trust_band'] as string,
      trust_reasons: (row['trust_reasons'] as string[]) ?? [],
      created_at: (row['created_at'] as Date).toISOString(),
      evidence_bundle_id: row['evidence_bundle_id'] as string,
      intent_hash_algorithm: row['intent_hash_algorithm'] as string,
      intent_hash_value: row['intent_hash_value'] as string,
      authorization_type: row['authorization_type'] as string,
      authorized: row['authorized'] as boolean,
      authorizer: row['authorizer'] as string,
      policy_trace: row['policy_trace'] as EvidenceData['policy_trace'],
      screening_result: row['screening_result'] as string,
      screened_entity: row['screened_entity'] as string,
      screening_screened_at: (row['screening_screened_at'] as Date).toISOString(),
      exec_tx_hash: (row['exec_tx_hash'] as string | null) ?? null,
      exec_chain: row['exec_chain'] as string,
      exec_observed_onchain: row['exec_observed_onchain'] as boolean,
      record_hash: row['record_hash'] as string,
      previous_record_hash: row['previous_record_hash'] as string,
      chain_index: row['chain_index'] as number,
      render_headline: row['render_headline'] as string,
      render_subheadline: row['render_subheadline'] as string,
      render_risk_label: row['render_risk_label'] as string,
    };
  }

  private parseSections(markdown: string, requiredSections: string[]): Record<string, string> {
    const sections: Record<string, string> = {};

    for (const key of requiredSections) {
      // Match ## section_key or ## Section Title
      const pattern = new RegExp(
        `##\\s*${key.replace(/_/g, '[_ ]')}[\\s\\S]*?(?=##\\s|---\\s|$)`,
        'i',
      );
      const match = markdown.match(pattern);
      if (match?.[0]) {
        // Remove the heading line and trim
        const content = match[0].replace(/^##[^\n]*\n/, '').trim();
        sections[key] = content;
      } else {
        sections[key] = '';
      }
    }

    return sections;
  }

  private buildFilterWhere(filters: Record<string, unknown>): { sql: string; params: string[] } {
    const clauses: string[] = [];
    const params: string[] = [];
    let idx = 2; // $1 is org_id

    if (filters['status'] && typeof filters['status'] === 'string') {
      clauses.push(`AND status = $${idx}`);
      params.push(filters['status']);
      idx++;
    }
    if (filters['agent_id'] && typeof filters['agent_id'] === 'string') {
      clauses.push(`AND agent_id = $${idx}`);
      params.push(filters['agent_id']);
      idx++;
    }
    if (filters['chain'] && typeof filters['chain'] === 'string') {
      clauses.push(`AND payment_chain = $${idx}`);
      params.push(filters['chain']);
      idx++;
    }
    if (filters['from'] && typeof filters['from'] === 'string') {
      clauses.push(`AND created_at >= $${idx}`);
      params.push(filters['from']);
      idx++;
    }
    if (filters['to'] && typeof filters['to'] === 'string') {
      clauses.push(`AND created_at <= $${idx}`);
      params.push(filters['to']);
      idx++;
    }

    return { sql: clauses.join(' '), params };
  }
}
