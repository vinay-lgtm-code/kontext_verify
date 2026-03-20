import type { Responses, SubScores } from "./assessment-engine";

export interface Findings {
  topGaps: string[];
  teamImpacts: {
    compliance: string;
    riskFraud: string;
    audit: string;
    platformProduct: string;
  };
  recommendedSchema: string[];
  roadmap: {
    mustHave: string[];
    shouldHave: string[];
    advanced: string[];
  };
}

function getVal(responses: Responses, key: string): number {
  const scoreMap: Record<string, Record<string, number>> = {
    capture_payment_intent: { yes_always_one_place: 1, yes_inconsistently: 0.75, app_logs_only: 0.5, usually_not_captured: 0.25, not_sure: 0 },
    identify_initiator: { exact_user_service_agent_workflow_id: 1, usually_yes: 0.75, sometimes: 0.5, rarely: 0.25, no: 0 },
    screening_policy_results_linked: { full_results_linked: 1, partial_results_linked: 0.75, results_in_other_system: 0.5, pass_fail_only: 0.25, no_or_not_sure: 0 },
    policy_version_known: { exact_policy_version: 1, policy_name_only: 0.75, inferred_manually: 0.5, no: 0, not_sure: 0 },
    approvals_linked: { yes_fully_linked: 1, linked_for_some_flows: 0.75, tracked_in_slack_email_tickets_only: 0.5, rarely: 0.25, no: 0 },
    execution_linkage: { yes_automatically: 1, yes_manually: 0.75, sometimes: 0.5, rarely: 0.25, no: 0 },
    systems_to_check_for_challenge: { "1": 1, "2": 0.75, "3": 0.5, "4_plus": 0.25, not_sure: 0 },
    evidence_storage_state: { unified_and_queryable: 1, split_across_2_3_systems: 0.75, spread_across_4_plus_systems: 0.25, mostly_raw_logs: 0.5, mostly_ad_hoc_manual: 0 },
  };
  const answer = responses[key];
  if (Array.isArray(answer)) return 0;
  return scoreMap[key]?.[answer ?? ""] ?? 0;
}

export function generateFindings(
  responses: Responses,
  subScores: SubScores,
  tags: string[]
): Findings {
  const topGaps: string[] = [];

  if (getVal(responses, "screening_policy_results_linked") <= 0.5 && getVal(responses, "execution_linkage") <= 0.5) {
    topGaps.push("Screening and execution evidence are not strongly linked — no proof that checks ran before the payment executed.");
  }
  if (getVal(responses, "policy_version_known") === 0) {
    topGaps.push("Unable to prove which policy version was active when a payment was allowed.");
  }
  if (getVal(responses, "approvals_linked") <= 0.5) {
    topGaps.push("Approval and override evidence sits outside the payment record (Slack, email, tickets).");
  }
  if (getVal(responses, "systems_to_check_for_challenge") <= 0.25 || getVal(responses, "evidence_storage_state") <= 0.25) {
    topGaps.push("Evidence fragmentation is likely slowing audit and incident response.");
  }
  if (getVal(responses, "capture_payment_intent") <= 0.5 || getVal(responses, "identify_initiator") <= 0.5) {
    topGaps.push("Intent and initiator attribution appear inconsistently captured.");
  }

  if (topGaps.length === 0) {
    topGaps.push("No critical evidence gaps detected in the assessed flow.");
  }

  const compliance =
    subScores.policyEvidence < 15
      ? "Compliance may struggle to demonstrate that screening checks ran and policies were applied at the time of each payment."
      : "Compliance appears to have reasonable evidence linkage for screening and policy results.";

  const riskFraud =
    subScores.intentAttribution < 15
      ? "Risk and fraud teams may not be able to quickly identify what initiated a flagged payment or reconstruct the decision context."
      : "Risk and fraud teams have adequate attribution data for most payment decisions.";

  const audit =
    subScores.auditReplayReadiness < 15
      ? "Internal audit is likely spending excessive time reconstructing evidence across fragmented systems for each review."
      : "Internal audit has a reasonable path to reconstruct payment evidence, though improvement is possible.";

  const platformProduct =
    tags.includes("fragmented_evidence")
      ? "Platform teams are maintaining evidence across too many systems, increasing the cost and risk of every compliance-related engineering request."
      : "Platform evidence infrastructure appears consolidated enough for current needs.";

  const recommendedSchema = [
    "Payment intent (initiator, purpose, amount, recipient, justification)",
    "Screening result with timestamp, provider, list version",
    "Policy version or rule set ID applied at decision time",
    "Approval or override record with approver identity and authority",
    "Execution reference (tx hash, payout ID, processor confirmation)",
    "Tamper-evident chain position or integrity hash",
    "Exportable case packet with all linked evidence",
  ];

  const mustHave: string[] = [];
  const shouldHave: string[] = [];
  const advanced: string[] = [];

  if (tags.includes("weak_policy_evidence") || tags.includes("no_policy_versioning")) {
    mustHave.push("Link screening results (with timestamps and list version) directly to each payment record.");
  }
  if (tags.includes("approval_gap") || tags.includes("manual_approvals")) {
    mustHave.push("Move approval and override evidence from Slack/email into the payment record.");
  }
  if (tags.includes("weak_execution_linkage")) {
    mustHave.push("Automatically link execution references (tx hash, payout ID) back to the decision record.");
  }
  if (getVal(responses, "capture_payment_intent") <= 0.5) {
    mustHave.push("Capture structured payment intent (initiator, purpose, scope) at decision time.");
  }
  if (mustHave.length === 0) {
    mustHave.push("Maintain current evidence capture practices and review quarterly.");
  }

  if (tags.includes("fragmented_evidence")) {
    shouldHave.push("Consolidate evidence into fewer systems or a unified queryable store.");
  }
  if (tags.includes("no_policy_versioning")) {
    shouldHave.push("Track and log the policy/rules version applied to each payment decision.");
  }
  if (tags.includes("slow_replay")) {
    shouldHave.push("Build a single-query evidence replay capability for challenged payments.");
  }
  if (shouldHave.length === 0) {
    shouldHave.push("Improve evidence export capabilities for partner and examiner review.");
  }

  if (tags.includes("no_integrity_layer")) {
    advanced.push("Add tamper-evident integrity verification (hash chain or similar) to decision history.");
  }
  advanced.push("Implement automated evidence packet generation for audit and partner diligence requests.");
  advanced.push("Add real-time anomaly detection across payment decision patterns.");

  return {
    topGaps: topGaps.slice(0, 5),
    teamImpacts: { compliance, riskFraud, audit, platformProduct },
    recommendedSchema,
    roadmap: { mustHave, shouldHave, advanced },
  };
}
