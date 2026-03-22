import type { Responses } from "./assessment-questions";

export type { Responses };

export type ReadinessTier = "at_risk" | "developing" | "operationally_ready" | "reviewer_ready";

export interface SubScores {
  decisionTraceability: number;
  reviewerReadiness: number;
  operationalResilience: number;
  automationControls?: number;
}

export interface AssessmentScores {
  overallTier: ReadinessTier;
  overallScore: number;
  subScores: SubScores;
  blockerTags: string[];
  artifactGapTags: string[];
  persona: {
    role?: string;
    companyType?: string;
    stage?: string;
    depth?: string;
  };
}

// Coarse scoring maps per question
const scoreMap: Record<string, Record<string, number>> = {
  decision_context_location: {
    single_case_timeline: 1.0,
    one_ops_system_plus_some_manual: 0.75,
    multiple_systems_manual_stitching: 0.5,
    raw_logs_and_spreadsheets: 0.25,
    not_sure: 0.0,
  },
  approval_recording: {
    tied_to_payment_and_exportable: 1.0,
    stored_in_one_ops_system_not_exportable: 0.75,
    slack_email_jira_only: 0.5,
    inconsistent: 0.25,
    no_formal_record: 0.0,
  },
  screening_evidence_confidence: {
    single_evidence_trail: 1.0,
    provable_across_multiple_systems: 0.75,
    manual_reconstruction_only: 0.5,
    probably_not: 0.25,
    do_not_run_or_not_sure: 0.0,
  },
  approval_enforcement: {
    system_enforced_blocking: 1.0,
    workflow_routed: 0.75,
    alert_based: 0.5,
    honor_system: 0.25,
    no_threshold_enforcement: 0.0,
  },
  exception_handling_model: {
    queued_with_audit_trail: 1.0,
    manual_review_some_logging: 0.75,
    ad_hoc_slack_email: 0.5,
    retried_or_bypassed: 0.25,
    not_sure: 0.0,
  },
  systems_to_reconstruct: {
    "1": 1.0,
    "2": 0.75,
    "3": 0.5,
    "4_plus": 0.25,
    not_sure: 0.0,
  },
  reviewer_request_response_time: {
    single_export_packet: 1.0,
    same_day_manual_compilation: 0.75,
    one_to_three_days_with_multiple_teams: 0.25,
    unclear_or_unreliable: 0.0,
  },
  challenged_payment_reconstruction: {
    unified_case_timeline: 1.0,
    ops_tool_plus_processor: 0.75,
    slack_email_and_logs: 0.25,
    not_sure: 0.0,
  },
  policy_version_provability: {
    exact_version: 1.0,
    policy_name_only: 0.75,
    inferred_manually: 0.5,
    no: 0.0,
  },
  screening_before_execution_provability: {
    yes_single_trail: 1.0,
    yes_manual_join: 0.75,
    maybe: 0.5,
    no: 0.0,
  },
  automation_scope: {
    recommendation_only: 1.0,
    auto_with_thresholds: 0.75,
    auto_with_exceptions: 0.5,
    broad_autonomy: 0.25,
    not_sure: 0.0,
  },
  automated_initiator_distinguishable: {
    always: 1.0,
    mostly: 0.75,
    partially: 0.5,
    no: 0.0,
  },
  agent_instruction_context: {
    yes_linked: 1.0,
    yes_but_fragmented: 0.75,
    partial: 0.5,
    no: 0.0,
  },
  autonomous_threshold_behavior: {
    blocked_or_approval_required: 1.0,
    routed_to_review_queue: 0.75,
    alert_only: 0.5,
    executes_if_credentials_valid: 0.25,
    not_sure: 0.0,
  },
  agent_override_recording: {
    fully: 1.0,
    partially: 0.75,
    elsewhere: 0.5,
    no: 0.0,
  },
  can_generate_packet: {
    yes_standardized: 1.0,
    yes_manual_template: 0.75,
    partial: 0.5,
    no: 0.0,
  },
  primary_blocker_today: {
    fragmented_evidence: 0.5,
    manual_approvals: 0.5,
    no_policy_versioning: 0.25,
    weak_screening_proof: 0.25,
    poor_incident_replay: 0.5,
    automation_without_controls: 0.25,
    no_owner: 0.0,
  },
};

function getScore(questionId: string, responses: Responses): number | null {
  const answer = responses[questionId];
  if (answer === undefined || Array.isArray(answer)) return null;
  return scoreMap[questionId]?.[answer] ?? null;
}

function weightedAverage(entries: { score: number | null; weight: number }[]): number {
  let totalWeight = 0;
  let totalScore = 0;
  for (const { score, weight } of entries) {
    if (score !== null) {
      totalWeight += weight;
      totalScore += score * weight;
    }
  }
  if (totalWeight === 0) return 50; // neutral default if no data
  return Math.round((totalScore / totalWeight) * 100);
}

function getTier(score: number): ReadinessTier {
  if (score >= 80) return "reviewer_ready";
  if (score >= 60) return "operationally_ready";
  if (score >= 40) return "developing";
  return "at_risk";
}

function hasNonHumanSources(responses: Responses): boolean {
  const sources = responses["initiation_sources"];
  if (!Array.isArray(sources)) return false;
  return sources.some((s) => s === "workflow" || s === "api_service" || s === "ai_agent");
}

function collectBlockerTags(responses: Responses): string[] {
  const tags: string[] = [];

  const screening = getScore("screening_evidence_confidence", responses);
  if (screening !== null && screening <= 0.25) tags.push("weak_screening_proof");

  const approval = getScore("approval_recording", responses);
  if (approval !== null && approval <= 0.5) tags.push("approval_gap");

  const context = getScore("decision_context_location", responses);
  if (context !== null && context <= 0.5) tags.push("fragmented_context");

  const systems = getScore("systems_to_reconstruct", responses);
  if (systems !== null && systems <= 0.25) tags.push("fragmented_evidence");

  const policyVersion = getScore("policy_version_provability", responses);
  if (policyVersion !== null && policyVersion <= 0.5) tags.push("no_policy_versioning");

  const responseTime = getScore("reviewer_request_response_time", responses);
  if (responseTime !== null && responseTime <= 0.25) tags.push("slow_response");

  const exception = getScore("exception_handling_model", responses);
  if (exception !== null && exception <= 0.25) tags.push("weak_exception_handling");

  const threshold = getScore("autonomous_threshold_behavior", responses);
  if (threshold !== null && threshold <= 0.5) tags.push("weak_autonomous_controls");

  const initiator = getScore("automated_initiator_distinguishable", responses);
  if (initiator !== null && initiator <= 0.5) tags.push("initiator_not_distinguishable");

  const blocker = responses["primary_blocker_today"];
  if (typeof blocker === "string" && blocker !== "") tags.push(`blocker_${blocker}`);

  return tags;
}

function collectArtifactGapTags(responses: Responses): string[] {
  const tags: string[] = [];

  const missingFields = responses["packet_missing_fields"];
  if (Array.isArray(missingFields)) {
    for (const f of missingFields) {
      if (f !== "none") tags.push(`missing_${f}`);
    }
  }

  // Infer from scores if packet_missing_fields wasn't answered
  if (!Array.isArray(missingFields) || missingFields.length === 0) {
    const screening = getScore("screening_evidence_confidence", responses);
    if (screening !== null && screening <= 0.5) tags.push("missing_screening_timestamp");

    const approval = getScore("approval_recording", responses);
    if (approval !== null && approval <= 0.5) tags.push("missing_approval_lineage");

    const policyVersion = getScore("policy_version_provability", responses);
    if (policyVersion !== null && policyVersion <= 0.5) tags.push("missing_policy_version");

    const packet = getScore("can_generate_packet", responses);
    if (packet !== null && packet <= 0.5) tags.push("missing_export_record");
  }

  return tags;
}

export function scoreAssessment(responses: Responses): AssessmentScores {
  const decisionTraceability = weightedAverage([
    { score: getScore("decision_context_location", responses), weight: 0.35 },
    { score: getScore("approval_recording", responses), weight: 0.30 },
    { score: getScore("screening_evidence_confidence", responses), weight: 0.20 },
    { score: getScore("policy_version_provability", responses), weight: 0.15 },
  ]);

  const reviewerReadiness = weightedAverage([
    { score: getScore("reviewer_request_response_time", responses), weight: 0.30 },
    { score: getScore("screening_before_execution_provability", responses), weight: 0.25 },
    { score: getScore("can_generate_packet", responses), weight: 0.25 },
    { score: getScore("challenged_payment_reconstruction", responses), weight: 0.20 },
  ]);

  const operationalResilience = weightedAverage([
    { score: getScore("exception_handling_model", responses), weight: 0.30 },
    { score: getScore("systems_to_reconstruct", responses), weight: 0.30 },
    { score: getScore("approval_enforcement", responses), weight: 0.20 },
    { score: getScore("primary_blocker_today", responses), weight: 0.20 },
  ]);

  const hasAutomation = hasNonHumanSources(responses);
  let automationControls: number | undefined;
  if (hasAutomation) {
    const autoScore = weightedAverage([
      { score: getScore("automated_initiator_distinguishable", responses), weight: 0.25 },
      { score: getScore("autonomous_threshold_behavior", responses), weight: 0.25 },
      { score: getScore("agent_instruction_context", responses), weight: 0.25 },
      { score: getScore("agent_override_recording", responses), weight: 0.25 },
    ]);
    automationControls = autoScore;
  }

  // Overall: weighted average of applicable sub-scores
  const overallEntries: { score: number; weight: number }[] = [
    { score: decisionTraceability, weight: 0.30 },
    { score: reviewerReadiness, weight: 0.35 },
    { score: operationalResilience, weight: 0.20 },
  ];
  if (automationControls !== undefined) {
    overallEntries.push({ score: automationControls, weight: 0.15 });
    // Re-normalize weights
    const totalW = overallEntries.reduce((s, e) => s + e.weight, 0);
    for (const e of overallEntries) e.weight = e.weight / totalW;
  }
  const overallScore = Math.round(
    overallEntries.reduce((s, e) => s + e.score * e.weight, 0)
  );

  return {
    overallTier: getTier(overallScore),
    overallScore,
    subScores: {
      decisionTraceability,
      reviewerReadiness,
      operationalResilience,
      automationControls,
    },
    blockerTags: collectBlockerTags(responses),
    artifactGapTags: collectArtifactGapTags(responses),
    persona: {
      role: responses["role"] as string | undefined,
      companyType: responses["company_type"] as string | undefined,
      stage: responses["company_stage"] as string | undefined,
      depth: responses["assessment_depth"] as string | undefined,
    },
  };
}

export const tierLabels: Record<ReadinessTier, string> = {
  at_risk: "At risk",
  developing: "Developing",
  operationally_ready: "Operationally ready",
  reviewer_ready: "Reviewer ready",
};

export const tierColors: Record<ReadinessTier, string> = {
  at_risk: "var(--ic-red)",
  developing: "var(--ic-amber)",
  operationally_ready: "var(--ic-accent)",
  reviewer_ready: "var(--ic-green)",
};
