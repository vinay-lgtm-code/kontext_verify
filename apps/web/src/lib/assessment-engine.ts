export type Band = "strong" | "functional_but_exposed" | "significant_gaps" | "high_risk";

export interface SubScores {
  intentAttribution: number;
  policyEvidence: number;
  executionLinkage: number;
  auditReplayReadiness: number;
}

export interface AssessmentScores {
  overallScore: number;
  band: Band;
  subScores: SubScores;
  tags: string[];
}

export type Responses = Record<string, string | string[]>;

const scoreMap: Record<string, Record<string, number>> = {
  automation_level: {
    fully_automated: 1.0,
    agent_initiated_with_guardrails: 1.0,
    rule_based_with_human_review: 0.75,
    mostly_manual_with_software_assistance: 0.5,
    mostly_manual: 0.25,
  },
  capture_payment_intent: {
    yes_always_one_place: 1.0,
    yes_inconsistently: 0.75,
    app_logs_only: 0.5,
    usually_not_captured: 0.25,
    not_sure: 0.0,
  },
  identify_initiator: {
    exact_user_service_agent_workflow_id: 1.0,
    usually_yes: 0.75,
    sometimes: 0.5,
    rarely: 0.25,
    no: 0.0,
  },
  screening_policy_results_linked: {
    full_results_linked: 1.0,
    partial_results_linked: 0.75,
    results_in_other_system: 0.5,
    pass_fail_only: 0.25,
    no_or_not_sure: 0.0,
  },
  policy_version_known: {
    exact_policy_version: 1.0,
    policy_name_only: 0.75,
    inferred_manually: 0.5,
    no: 0.0,
    not_sure: 0.0,
  },
  approvals_linked: {
    yes_fully_linked: 1.0,
    linked_for_some_flows: 0.75,
    tracked_in_slack_email_tickets_only: 0.5,
    rarely: 0.25,
    no: 0.0,
  },
  execution_linkage: {
    yes_automatically: 1.0,
    yes_manually: 0.75,
    sometimes: 0.5,
    rarely: 0.25,
    no: 0.0,
  },
  systems_to_check_for_challenge: {
    "1": 1.0,
    "2": 0.75,
    "3": 0.5,
    "4_plus": 0.25,
    not_sure: 0.0,
  },
  packet_under_30_minutes: {
    yes_easily: 1.0,
    usually: 0.75,
    sometimes: 0.5,
    rarely: 0.25,
    no: 0.0,
  },
  evidence_storage_state: {
    unified_and_queryable: 1.0,
    split_across_2_3_systems: 0.75,
    spread_across_4_plus_systems: 0.25,
    mostly_raw_logs: 0.5,
    mostly_ad_hoc_manual: 0.0,
  },
  tamper_evident_records: {
    yes: 1.0,
    partially: 0.75,
    planned: 0.5,
    no: 0.0,
    not_sure: 0.0,
  },
};

function getScore(questionId: string, answer: string | string[]): number {
  if (Array.isArray(answer)) return 0;
  return scoreMap[questionId]?.[answer] ?? 0;
}

function getSystemsTouchedScore(answer: string | string[]): number {
  const count = Array.isArray(answer) ? answer.length : 1;
  if (count <= 2) return 1.0;
  if (count === 3) return 0.75;
  if (count === 4) return 0.5;
  return 0.25;
}

function getPainScore(answer: string | string[]): number {
  const items = Array.isArray(answer) ? answer : [answer];
  if (items.length === 1 && items[0] === "none_yet") return 1.0;
  const painCount = items.filter((v) => v !== "none_yet").length;
  if (painCount === 0) return 1.0;
  if (painCount === 1) return 0.75;
  if (painCount === 2) return 0.5;
  if (painCount === 3) return 0.25;
  return 0.0;
}

function getBand(score: number): Band {
  if (score >= 80) return "strong";
  if (score >= 60) return "functional_but_exposed";
  if (score >= 40) return "significant_gaps";
  return "high_risk";
}

function collectTags(responses: Responses): string[] {
  const tags: string[] = [];

  const rails = responses["rails"];
  if (Array.isArray(rails)) {
    if (rails.includes("stablecoin")) tags.push("stablecoin");
    if (rails.length >= 2) tags.push("multi_rail");
  }

  const systems = responses["systems_touched"];
  if (Array.isArray(systems) && systems.length >= 4) tags.push("fragmented_evidence");

  const screening = responses["screening_policy_results_linked"];
  if (screening === "results_in_other_system") tags.push("screening_fragmented");
  if (screening === "pass_fail_only" || screening === "no_or_not_sure") tags.push("weak_policy_evidence");

  const policyVersion = responses["policy_version_known"];
  if (policyVersion === "no" || policyVersion === "not_sure") tags.push("no_policy_versioning");

  const approvals = responses["approvals_linked"];
  if (approvals === "tracked_in_slack_email_tickets_only") tags.push("manual_approvals");
  if (approvals === "rarely" || approvals === "no") tags.push("approval_gap");

  const execLink = responses["execution_linkage"];
  if (execLink === "sometimes" || execLink === "rarely" || execLink === "no") tags.push("weak_execution_linkage");

  const systemsCheck = responses["systems_to_check_for_challenge"];
  if (systemsCheck === "4_plus" || systemsCheck === "not_sure") {
    if (!tags.includes("fragmented_evidence")) tags.push("fragmented_evidence");
  }

  const packet = responses["packet_under_30_minutes"];
  if (packet === "rarely" || packet === "no") tags.push("slow_replay");

  const storage = responses["evidence_storage_state"];
  if (storage === "spread_across_4_plus_systems") {
    if (!tags.includes("fragmented_evidence")) tags.push("fragmented_evidence");
  }
  if (storage === "mostly_raw_logs") tags.push("raw_logs_only");
  if (storage === "mostly_ad_hoc_manual") tags.push("ad_hoc_evidence");

  const tamper = responses["tamper_evident_records"];
  if (tamper === "no" || tamper === "not_sure") tags.push("no_integrity_layer");

  const pain = responses["pain_last_12_months"];
  if (Array.isArray(pain)) {
    if (pain.includes("audit_requests")) tags.push("audit_pain");
    if (pain.includes("partner_or_bank_diligence")) tags.push("diligence_pain");
    if (pain.includes("sanctions_or_compliance_review")) tags.push("compliance_review_pain");
    if (pain.includes("fraud_investigation")) tags.push("fraud_investigation_pain");
    if (pain.includes("payment_dispute_or_failure_analysis")) tags.push("dispute_analysis_pain");
    if (pain.includes("internal_control_review")) tags.push("controls_review_pain");
    if (pain.includes("slow_incident_response")) tags.push("slow_incident_response");
  }

  return tags;
}

export function scoreAssessment(responses: Responses): AssessmentScores {
  const intentAttribution =
    25 *
    (0.1 * getScore("automation_level", responses["automation_level"] ?? "") +
      0.45 * getScore("capture_payment_intent", responses["capture_payment_intent"] ?? "") +
      0.45 * getScore("identify_initiator", responses["identify_initiator"] ?? ""));

  const policyEvidence =
    25 *
    (0.35 * getScore("screening_policy_results_linked", responses["screening_policy_results_linked"] ?? "") +
      0.3 * getScore("policy_version_known", responses["policy_version_known"] ?? "") +
      0.35 * getScore("approvals_linked", responses["approvals_linked"] ?? ""));

  const executionLinkage =
    25 *
    (0.3 * getSystemsTouchedScore(responses["systems_touched"] ?? []) +
      0.7 * getScore("execution_linkage", responses["execution_linkage"] ?? ""));

  const auditReplayReadiness =
    25 *
    (0.25 * getScore("systems_to_check_for_challenge", responses["systems_to_check_for_challenge"] ?? "") +
      0.25 * getScore("packet_under_30_minutes", responses["packet_under_30_minutes"] ?? "") +
      0.2 * getScore("evidence_storage_state", responses["evidence_storage_state"] ?? "") +
      0.15 * getScore("tamper_evident_records", responses["tamper_evident_records"] ?? "") +
      0.15 * getPainScore(responses["pain_last_12_months"] ?? []));

  const subScores: SubScores = {
    intentAttribution: Math.round(intentAttribution),
    policyEvidence: Math.round(policyEvidence),
    executionLinkage: Math.round(executionLinkage),
    auditReplayReadiness: Math.round(auditReplayReadiness),
  };

  const overallScore = Math.round(
    intentAttribution + policyEvidence + executionLinkage + auditReplayReadiness
  );

  return {
    overallScore,
    band: getBand(overallScore),
    subScores,
    tags: collectTags(responses),
  };
}

export const bandLabels: Record<Band, string> = {
  strong: "Strong evidence posture",
  functional_but_exposed: "Functional but exposed",
  significant_gaps: "Significant evidence gaps",
  high_risk: "High operational risk",
};

export const bandColors: Record<Band, string> = {
  strong: "var(--ic-green)",
  functional_but_exposed: "var(--ic-amber)",
  significant_gaps: "var(--ic-amber)",
  high_risk: "var(--ic-red)",
};
