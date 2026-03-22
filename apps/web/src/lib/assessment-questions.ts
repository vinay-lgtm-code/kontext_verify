export interface QuestionOption {
  value: string;
  label: string;
}

export type DepthTier = "quick" | "standard" | "deep";

export type Responses = Record<string, string | string[]>;

export interface AssessmentQuestion {
  id: string;
  type: "single_select" | "multi_select";
  prompt: string;
  helpText?: string;
  required: boolean;
  options: QuestionOption[];
  appliesWhen?: (responses: Responses) => boolean;
  depthTier: DepthTier;
}

export interface AssessmentSection {
  id: string;
  title: string;
  questions: AssessmentQuestion[];
}

function hasNonHumanInitiation(responses: Responses): boolean {
  const sources = responses["initiation_sources"];
  if (!Array.isArray(sources)) return false;
  return sources.some((s) => s === "workflow" || s === "api_service" || s === "ai_agent");
}

const depthOrder: Record<DepthTier, number> = { quick: 0, standard: 1, deep: 2 };

export function getVisibleQuestions(
  sections: AssessmentSection[],
  responses: Responses
): { question: AssessmentQuestion; sectionIndex: number }[] {
  const selectedDepth = (responses["assessment_depth"] as string) ?? "quick";
  const depthLevel = depthOrder[selectedDepth as DepthTier] ?? 0;

  return sections.flatMap((section, si) =>
    section.questions
      .filter((q) => {
        if (depthOrder[q.depthTier] > depthLevel) return false;
        if (q.appliesWhen && !q.appliesWhen(responses)) return false;
        return true;
      })
      .map((q) => ({ question: q, sectionIndex: si }))
  );
}

export function getVisibleSections(
  sections: AssessmentSection[],
  responses: Responses
): { section: AssessmentSection; index: number }[] {
  const visible = getVisibleQuestions(sections, responses);
  const sectionIndices = new Set(visible.map((v) => v.sectionIndex));
  return sections
    .map((s, i) => ({ section: s, index: i }))
    .filter((s) => sectionIndices.has(s.index));
}

export const assessmentSections: AssessmentSection[] = [
  {
    id: "profile",
    title: "Profile",
    questions: [
      {
        id: "assessment_depth",
        type: "single_select",
        prompt: "How thorough would you like this assessment to be?",
        helpText: "You can always run it again at a different depth.",
        required: true,
        depthTier: "quick",
        options: [
          { value: "quick", label: "Quick scan (~3 min) -- profile + core operating reality" },
          { value: "standard", label: "Standard (~6 min) -- adds reviewer simulation + artifact readiness" },
          { value: "deep", label: "Deep dive (~8 min) -- adds agentic/automation controls" },
        ],
      },
      {
        id: "role",
        type: "single_select",
        prompt: "What best describes your role?",
        required: true,
        depthTier: "quick",
        options: [
          { value: "founder_coo", label: "Founder / COO" },
          { value: "compliance_risk", label: "Compliance / Risk" },
          { value: "payments_ops", label: "Payments Ops" },
          { value: "product_engineering", label: "Product / Engineering" },
          { value: "treasury_finance", label: "Treasury / Finance" },
        ],
      },
      {
        id: "company_type",
        type: "single_select",
        prompt: "What type of company are you?",
        required: true,
        depthTier: "quick",
        options: [
          { value: "stablecoin_infrastructure", label: "Stablecoin infrastructure" },
          { value: "cross_border_payouts", label: "Cross-border payouts" },
          { value: "embedded_finance_baas", label: "Embedded finance / BaaS" },
          { value: "treasury_automation", label: "Treasury automation" },
          { value: "neobank_wallet", label: "Neobank / wallet" },
          { value: "other", label: "Other" },
        ],
      },
      {
        id: "company_stage",
        type: "single_select",
        prompt: "Where are you in your journey?",
        required: true,
        depthTier: "quick",
        options: [
          { value: "pre_launch", label: "Pre-launch" },
          { value: "launch_90_days", label: "Launching in the next 90 days" },
          { value: "live_single_rail", label: "Live on a single rail" },
          { value: "live_multi_rail", label: "Live on multiple rails" },
          { value: "enterprise_scale", label: "Enterprise scale" },
        ],
      },
      {
        id: "monthly_volume_band",
        type: "single_select",
        prompt: "What is your approximate monthly payment volume?",
        required: true,
        depthTier: "quick",
        options: [
          { value: "under_100k", label: "Under $100K" },
          { value: "100k_to_1m", label: "$100K - $1M" },
          { value: "1m_to_10m", label: "$1M - $10M" },
          { value: "10m_to_100m", label: "$10M - $100M" },
          { value: "over_100m", label: "Over $100M" },
        ],
      },
      {
        id: "rails",
        type: "multi_select",
        prompt: "Which payment rails do you use?",
        required: true,
        depthTier: "quick",
        options: [
          { value: "stablecoin", label: "Stablecoin" },
          { value: "ach", label: "ACH" },
          { value: "wire", label: "Wire" },
          { value: "rtp_instant", label: "RTP / instant payments" },
          { value: "card", label: "Card" },
          { value: "cross_border", label: "Cross-border payout provider" },
          { value: "internal_ledger", label: "Internal ledger" },
          { value: "other", label: "Other" },
        ],
      },
      {
        id: "initiation_sources",
        type: "multi_select",
        prompt: "Which of the following can initiate or influence payment actions today?",
        required: true,
        depthTier: "quick",
        options: [
          { value: "human", label: "Humans only" },
          { value: "workflow", label: "Automated workflows" },
          { value: "api_service", label: "Internal APIs / services" },
          { value: "ai_agent", label: "AI agents / LLM-driven systems" },
        ],
      },
    ],
  },
  {
    id: "operating_reality",
    title: "Operating reality",
    questions: [
      {
        id: "decision_context_location",
        type: "single_select",
        prompt: "Where does payment decision context primarily live today?",
        helpText: "Decision context includes: who initiated, why, what policy applied, what checks ran.",
        required: true,
        depthTier: "quick",
        options: [
          { value: "single_case_timeline", label: "Single case timeline or unified system" },
          { value: "one_ops_system_plus_some_manual", label: "One ops system plus some manual records" },
          { value: "multiple_systems_manual_stitching", label: "Multiple systems requiring manual stitching" },
          { value: "raw_logs_and_spreadsheets", label: "Raw logs and spreadsheets" },
          { value: "not_sure", label: "Not sure" },
        ],
      },
      {
        id: "approval_recording",
        type: "single_select",
        prompt: "How are approvals and overrides recorded today?",
        required: true,
        depthTier: "quick",
        options: [
          { value: "tied_to_payment_and_exportable", label: "Tied to the payment record and exportable" },
          { value: "stored_in_one_ops_system_not_exportable", label: "Stored in one ops system, not easily exportable" },
          { value: "slack_email_jira_only", label: "Slack, email, or Jira only" },
          { value: "inconsistent", label: "Inconsistent across flows" },
          { value: "no_formal_record", label: "No formal record" },
        ],
      },
      {
        id: "screening_evidence_confidence",
        type: "single_select",
        prompt: "How confidently could you prove that screening happened before execution for a payment from 45 days ago?",
        required: true,
        depthTier: "quick",
        options: [
          { value: "single_evidence_trail", label: "Single evidence trail with timestamps" },
          { value: "provable_across_multiple_systems", label: "Provable, but across multiple systems" },
          { value: "manual_reconstruction_only", label: "Manual reconstruction only" },
          { value: "probably_not", label: "Probably not" },
          { value: "do_not_run_or_not_sure", label: "We don't run screening / not sure" },
        ],
      },
      {
        id: "approval_enforcement",
        type: "single_select",
        prompt: "How are approval requirements enforced for payments above policy thresholds?",
        required: true,
        depthTier: "standard",
        options: [
          { value: "system_enforced_blocking", label: "System blocks execution without required approvals" },
          { value: "workflow_routed", label: "Routed to an approval queue" },
          { value: "alert_based", label: "Alert-based -- relies on people checking" },
          { value: "honor_system", label: "Honor system / manual process" },
          { value: "no_threshold_enforcement", label: "No threshold-based enforcement" },
        ],
      },
      {
        id: "exception_handling_model",
        type: "single_select",
        prompt: "When a payment hits an exception (screening flag, threshold breach, error), what happens?",
        required: true,
        depthTier: "standard",
        options: [
          { value: "queued_with_audit_trail", label: "Queued for review with full audit trail" },
          { value: "manual_review_some_logging", label: "Manual review with some logging" },
          { value: "ad_hoc_slack_email", label: "Ad hoc -- handled in Slack/email" },
          { value: "retried_or_bypassed", label: "Retried or bypassed without formal review" },
          { value: "not_sure", label: "Not sure" },
        ],
      },
      {
        id: "systems_to_reconstruct",
        type: "single_select",
        prompt: "If a partner reviewer challenges one payment, how many systems usually need to be checked?",
        required: true,
        depthTier: "standard",
        options: [
          { value: "1", label: "1 system" },
          { value: "2", label: "2 systems" },
          { value: "3", label: "3 systems" },
          { value: "4_plus", label: "4+ systems" },
          { value: "not_sure", label: "Not sure" },
        ],
      },
    ],
  },
  {
    id: "reviewer_simulation",
    title: "Reviewer simulation",
    questions: [
      {
        id: "reviewer_request_response_time",
        type: "single_select",
        prompt: "A sponsor bank asks who approved a high-value payout, what policy applied, and whether screening ran before execution. What would happen?",
        required: true,
        depthTier: "standard",
        options: [
          { value: "single_export_packet", label: "We'd export a single packet with all of that" },
          { value: "same_day_manual_compilation", label: "Same-day manual compilation across systems" },
          { value: "one_to_three_days_with_multiple_teams", label: "1-3 days involving multiple teams" },
          { value: "unclear_or_unreliable", label: "Unclear or unreliable" },
        ],
      },
      {
        id: "challenged_payment_reconstruction",
        type: "single_select",
        prompt: "A payment is questioned two weeks later. Where would your team look first?",
        required: true,
        depthTier: "standard",
        options: [
          { value: "unified_case_timeline", label: "Unified case timeline" },
          { value: "ops_tool_plus_processor", label: "Ops tool plus payment processor" },
          { value: "slack_email_and_logs", label: "Slack, email, and logs" },
          { value: "not_sure", label: "Not sure" },
        ],
      },
      {
        id: "policy_version_provability",
        type: "single_select",
        prompt: "Could you prove which policy or rule version governed a specific payment decision at the time it was made?",
        required: true,
        depthTier: "standard",
        options: [
          { value: "exact_version", label: "Yes, exact version linked to the decision" },
          { value: "policy_name_only", label: "Policy name only, not the version" },
          { value: "inferred_manually", label: "Could be inferred manually" },
          { value: "no", label: "No" },
        ],
      },
      {
        id: "screening_before_execution_provability",
        type: "single_select",
        prompt: "Could you prove screening happened before funds moved -- not just that screening exists somewhere?",
        required: true,
        depthTier: "standard",
        options: [
          { value: "yes_single_trail", label: "Yes, single evidence trail with timestamps" },
          { value: "yes_manual_join", label: "Yes, but requires manual join across systems" },
          { value: "maybe", label: "Maybe -- depends on the payment" },
          { value: "no", label: "No" },
        ],
      },
    ],
  },
  {
    id: "automation_controls",
    title: "Automation controls",
    questions: [
      {
        id: "automation_scope",
        type: "single_select",
        prompt: "How much of this flow can execute without a human touching the payment?",
        required: true,
        depthTier: "deep",
        appliesWhen: hasNonHumanInitiation,
        options: [
          { value: "recommendation_only", label: "Recommendation only -- human always executes" },
          { value: "auto_with_thresholds", label: "Auto-executes within defined thresholds" },
          { value: "auto_with_exceptions", label: "Auto-executes with exception routing" },
          { value: "broad_autonomy", label: "Broad autonomy with minimal guardrails" },
          { value: "not_sure", label: "Not sure" },
        ],
      },
      {
        id: "automated_initiator_distinguishable",
        type: "single_select",
        prompt: "Can you distinguish human-, API-, workflow-, and AI-agent-initiated actions in reporting and review?",
        required: true,
        depthTier: "deep",
        appliesWhen: hasNonHumanInitiation,
        options: [
          { value: "always", label: "Always -- clearly labeled in records" },
          { value: "mostly", label: "Mostly -- some gaps" },
          { value: "partially", label: "Partially" },
          { value: "no", label: "No" },
        ],
      },
      {
        id: "agent_instruction_context",
        type: "single_select",
        prompt: "For AI- or workflow-initiated payments, can you reconstruct the instruction, task, or workflow context later?",
        required: true,
        depthTier: "deep",
        appliesWhen: hasNonHumanInitiation,
        options: [
          { value: "yes_linked", label: "Yes, linked to the payment record" },
          { value: "yes_but_fragmented", label: "Yes, but fragmented across systems" },
          { value: "partial", label: "Partially" },
          { value: "no", label: "No" },
        ],
      },
      {
        id: "autonomous_threshold_behavior",
        type: "single_select",
        prompt: "If an automated or AI-driven payment exceeds a policy threshold, what happens next?",
        required: true,
        depthTier: "deep",
        appliesWhen: hasNonHumanInitiation,
        options: [
          { value: "blocked_or_approval_required", label: "Blocked until human approval" },
          { value: "routed_to_review_queue", label: "Routed to a review queue" },
          { value: "alert_only", label: "Alert sent, but execution continues" },
          { value: "executes_if_credentials_valid", label: "Executes if credentials are valid" },
          { value: "not_sure", label: "Not sure" },
        ],
      },
      {
        id: "agent_override_recording",
        type: "single_select",
        prompt: "Are human overrides or exception approvals for autonomous actions preserved with the payment evidence?",
        required: true,
        depthTier: "deep",
        appliesWhen: hasNonHumanInitiation,
        options: [
          { value: "fully", label: "Fully -- linked to the payment record" },
          { value: "partially", label: "Partially -- in a separate system" },
          { value: "elsewhere", label: "Recorded elsewhere (Slack, email)" },
          { value: "no", label: "No" },
        ],
      },
    ],
  },
  {
    id: "artifact_readiness",
    title: "Artifact readiness",
    questions: [
      {
        id: "can_generate_packet",
        type: "single_select",
        prompt: "Can you generate a reviewer-ready payment evidence packet today?",
        helpText: "A packet that a sponsor bank or partner could review without additional questions.",
        required: true,
        depthTier: "standard",
        options: [
          { value: "yes_standardized", label: "Yes, standardized and automated" },
          { value: "yes_manual_template", label: "Yes, using a manual template" },
          { value: "partial", label: "Partially -- missing key fields" },
          { value: "no", label: "No" },
        ],
      },
      {
        id: "packet_missing_fields",
        type: "multi_select",
        prompt: "Which of these fields are missing or incomplete in your current payment evidence?",
        helpText: "Select all that apply.",
        required: true,
        depthTier: "deep",
        options: [
          { value: "initiator_type", label: "Initiator type (human / API / agent)" },
          { value: "policy_version", label: "Policy version at decision time" },
          { value: "screening_timestamp", label: "Screening timestamp and result" },
          { value: "approval_lineage", label: "Approval lineage" },
          { value: "exception_disposition", label: "Exception disposition" },
          { value: "execution_reference", label: "Execution reference (tx hash, payout ID)" },
          { value: "export_record", label: "Exportable evidence record" },
          { value: "instruction_context", label: "Instruction / task context (for automated flows)" },
          { value: "none", label: "None -- we have all of these" },
        ],
      },
      {
        id: "primary_blocker_today",
        type: "single_select",
        prompt: "What is the single biggest blocker to becoming reviewer-ready?",
        required: true,
        depthTier: "standard",
        options: [
          { value: "fragmented_evidence", label: "Evidence is fragmented across too many systems" },
          { value: "manual_approvals", label: "Approvals live in Slack/email, not the payment record" },
          { value: "no_policy_versioning", label: "No policy versioning or audit trail" },
          { value: "weak_screening_proof", label: "Cannot prove screening ran before execution" },
          { value: "poor_incident_replay", label: "Incident reconstruction takes too long" },
          { value: "automation_without_controls", label: "Automation is outpacing evidence capture" },
          { value: "no_owner", label: "No clear owner for compliance evidence" },
        ],
      },
    ],
  },
];
