import type { AssessmentScores, Responses } from "./assessment-engine";

export interface PacketFieldStatus {
  field: string;
  status: "present" | "partial" | "missing";
  conditional?: boolean;
}

export interface Findings {
  bluntSummary: string;
  likelyReviewerBlockers: string[];
  likelyFailureModes: string[];
  reviewerQuestionsAtRisk: string[];
  missingArtifacts: string[];
  teamImpacts: {
    compliance: string;
    riskFraud: string;
    audit: string;
    platformProduct: string;
  };
  remediationPlan: {
    days30: string[];
    days60: string[];
    days90: string[];
  };
  packetPreview: PacketFieldStatus[];
  recommendedPacketFields: string[];
  nextBestAsset: {
    href: string;
    label: string;
  };
}

function hasAutomation(responses: Responses): boolean {
  const sources = responses["initiation_sources"];
  if (!Array.isArray(sources)) return false;
  return sources.some((s) => s === "workflow" || s === "api_service" || s === "ai_agent");
}

function hasAIAgent(responses: Responses): boolean {
  const sources = responses["initiation_sources"];
  return Array.isArray(sources) && sources.includes("ai_agent");
}

function stageLabel(stage: string | undefined): string {
  const labels: Record<string, string> = {
    pre_launch: "pre-launch",
    launch_90_days: "pre-launch",
    live_single_rail: "live",
    live_multi_rail: "live multi-rail",
    enterprise_scale: "enterprise",
  };
  return labels[stage ?? ""] ?? "current";
}

function generateBluntSummary(scores: AssessmentScores, responses: Responses): string {
  const auto = hasAutomation(responses);
  const stage = stageLabel(scores.persona.stage);

  if (scores.overallTier === "at_risk") {
    if (auto) {
      return `Your ${stage} payment stack has significant evidence gaps, and autonomous or automated payment actions would likely be very hard to explain during partner review. The most urgent risk is a lack of structured decision evidence.`;
    }
    return `Your ${stage} payment stack has significant evidence gaps. A sponsor bank or partner reviewer would likely find it difficult to verify what controls ran and who approved key decisions.`;
  }

  if (scores.overallTier === "developing") {
    if (auto) {
      return `Your payment operations appear functional, but you are introducing autonomy faster than reviewer-ready evidence. Automated or AI-influenced payment actions would likely be hard to explain during partner review.`;
    }
    return `Your payment stack looks operationally usable, but not reviewer-ready. The biggest risk is fragmented evidence and weak proof that checks ran before execution.`;
  }

  if (scores.overallTier === "operationally_ready") {
    if (auto) {
      return `Your payment evidence infrastructure is solid for manual flows, but autonomous actions may not be fully explainable to a reviewer yet. Closing the automation control gaps would strengthen your position significantly.`;
    }
    return `Your payment evidence infrastructure handles most reviewer questions, but specific gaps remain that could slow launch reviews or partner diligence.`;
  }

  // reviewer_ready
  if (auto) {
    return `Your payment evidence infrastructure appears reviewer-ready, including controls for automated and AI-initiated flows. Continue maintaining evidence quality as payment volume and automation scope grow.`;
  }
  return `Your payment evidence infrastructure appears reviewer-ready. Evidence is well-linked, reviewer packets are producible, and key controls are in place.`;
}

function generateReviewerBlockers(scores: AssessmentScores, responses: Responses): string[] {
  const blockers: string[] = [];
  const tags = scores.blockerTags;

  if (tags.includes("weak_screening_proof")) {
    blockers.push("You would struggle to prove screening occurred before execution for a questioned payment.");
  }
  if (tags.includes("approval_gap")) {
    blockers.push("Approval evidence is not tied closely enough to the payment record.");
  }
  if (tags.includes("fragmented_evidence") || tags.includes("fragmented_context")) {
    blockers.push("Reviewer response likely depends on manual stitching across multiple systems.");
  }
  if (tags.includes("no_policy_versioning")) {
    blockers.push("Unable to prove which policy version was active when a payment was allowed.");
  }
  if (tags.includes("slow_response")) {
    blockers.push("Responding to a reviewer request would likely take days, not hours.");
  }
  if (tags.includes("weak_autonomous_controls") && hasAutomation(responses)) {
    blockers.push("Autonomous payment actions are not bounded by explicit approval or threshold evidence.");
  }
  if (tags.includes("initiator_not_distinguishable") && hasAutomation(responses)) {
    blockers.push("Automated and human-initiated payments are not clearly distinguishable in the evidence record.");
  }
  if (tags.includes("weak_exception_handling")) {
    blockers.push("Payment exceptions may be retried or bypassed without a formal review trail.");
  }

  if (blockers.length === 0) {
    blockers.push("No critical reviewer blockers detected based on your responses.");
  }

  return blockers;
}

function generateFailureModes(scores: AssessmentScores, responses: Responses): string[] {
  const modes: string[] = [];

  if (scores.subScores.reviewerReadiness < 50) {
    modes.push("Partner diligence or sponsor bank review takes days instead of hours.");
  }
  if (scores.subScores.decisionTraceability < 50) {
    modes.push("Incident reconstruction requires manual assembly across fragmented systems.");
  }
  if (scores.subScores.operationalResilience < 50) {
    modes.push("Payment exceptions are handled inconsistently, creating compliance exposure.");
  }
  if (scores.subScores.automationControls !== undefined && scores.subScores.automationControls < 50) {
    modes.push("Autonomous actions outpace evidence capture, making post-hoc review unreliable.");
  }

  return modes;
}

function generateReviewerQuestions(scores: AssessmentScores, responses: Responses): string[] {
  const questions: string[] = [];
  const tags = scores.blockerTags;

  if (tags.includes("approval_gap") || tags.includes("fragmented_context")) {
    questions.push("Who approved this payment?");
  }
  if (tags.includes("no_policy_versioning")) {
    questions.push("What policy version governed this decision?");
  }
  if (tags.includes("weak_screening_proof")) {
    questions.push("Did screening run before execution?");
  }
  if (tags.includes("weak_exception_handling")) {
    questions.push("Who approved the exception?");
  }
  if (tags.includes("initiator_not_distinguishable") && hasAutomation(responses)) {
    questions.push("Who or what initiated this payment?");
  }
  if (scores.subScores.reviewerReadiness < 60) {
    questions.push("Can you export the evidence without screenshots?");
  }
  if (hasAIAgent(responses) && (scores.subScores.automationControls ?? 100) < 60) {
    questions.push("What instruction or task triggered this autonomous action?");
  }

  if (questions.length === 0) {
    questions.push("Your current evidence appears to cover the most common reviewer questions.");
  }

  return questions;
}

function generateMissingArtifacts(scores: AssessmentScores, responses: Responses): string[] {
  const artifacts: string[] = [];
  const gapTags = scores.artifactGapTags;

  if (gapTags.includes("missing_screening_timestamp")) {
    artifacts.push("No structured screening timestamp artifact");
  }
  if (gapTags.includes("missing_approval_lineage")) {
    artifacts.push("No approval lineage artifact");
  }
  if (gapTags.includes("missing_policy_version")) {
    artifacts.push("No policy version record linked to payment decisions");
  }
  if (gapTags.includes("missing_export_record")) {
    artifacts.push("No exportable reviewer packet");
  }
  if (gapTags.includes("missing_initiator_type")) {
    artifacts.push("No initiator type field in payment records");
  }
  if (gapTags.includes("missing_instruction_context") && hasAutomation(responses)) {
    artifacts.push("No instruction-context capture for AI/workflow-initiated actions");
  }
  if (gapTags.includes("missing_exception_disposition")) {
    artifacts.push("No exception disposition record");
  }
  if (gapTags.includes("missing_execution_reference")) {
    artifacts.push("No execution reference linked to decision record");
  }

  // Infer from scores if no explicit tags
  if (artifacts.length === 0 && scores.overallScore < 60) {
    artifacts.push("No unified payment decision packet");
  }

  return artifacts;
}

function generateTeamImpacts(scores: AssessmentScores, responses: Responses): Findings["teamImpacts"] {
  const compliance =
    scores.subScores.decisionTraceability < 50
      ? "Compliance may struggle to demonstrate that screening checks ran and policies were applied at the time of each payment."
      : "Compliance appears to have reasonable evidence linkage for screening and policy results.";

  const riskFraud =
    scores.subScores.reviewerReadiness < 50
      ? "Risk and fraud teams may not be able to quickly produce evidence for a questioned payment or reconstruct the decision context."
      : "Risk and fraud teams have adequate tools to reconstruct payment decisions.";

  const audit =
    scores.subScores.operationalResilience < 50
      ? "Internal audit is likely spending excessive time reconstructing evidence across fragmented systems for each review."
      : "Internal audit has a reasonable path to reconstruct payment evidence.";

  const platformProduct =
    hasAutomation(responses) && (scores.subScores.automationControls ?? 100) < 50
      ? "Platform teams are deploying automation faster than the evidence infrastructure can support. Reviewers may not be able to distinguish automated from manual actions."
      : scores.blockerTags.includes("fragmented_evidence")
      ? "Platform teams are maintaining evidence across too many systems, increasing the cost and risk of every compliance-related request."
      : "Platform evidence infrastructure appears consolidated enough for current needs.";

  return { compliance, riskFraud, audit, platformProduct };
}

function generateRemediationPlan(scores: AssessmentScores, responses: Responses): Findings["remediationPlan"] {
  const days30: string[] = [];
  const days60: string[] = [];
  const days90: string[] = [];

  const tags = scores.blockerTags;

  // 30 days: taxonomy + logging + ownership
  if (tags.includes("fragmented_context") || tags.includes("fragmented_evidence")) {
    days30.push("Identify a single system of record for payment decision context.");
  }
  if (tags.includes("approval_gap")) {
    days30.push("Start capturing approval and override evidence alongside the payment record.");
  }
  if (tags.includes("weak_screening_proof")) {
    days30.push("Link screening results with timestamps directly to each payment record.");
  }
  if (tags.includes("initiator_not_distinguishable") && hasAutomation(responses)) {
    days30.push("Tag each payment with its initiation source (human, workflow, API, AI agent).");
  }
  if (tags.includes("no_owner") || scores.overallScore < 30) {
    days30.push("Assign an owner for payment compliance evidence infrastructure.");
  }
  if (days30.length === 0) {
    days30.push("Maintain current evidence capture practices and review quarterly.");
  }

  // 60 days: cross-system linking + exports + reviewer packet
  if (tags.includes("no_policy_versioning")) {
    days60.push("Track and log the policy version applied to each payment decision.");
  }
  if (tags.includes("slow_response")) {
    days60.push("Build a single-query evidence export for reviewer requests.");
  }
  if (scores.subScores.reviewerReadiness < 60) {
    days60.push("Create a standardized reviewer-ready payment evidence packet template.");
  }
  if (tags.includes("weak_exception_handling")) {
    days60.push("Formalize exception handling with queued review and audit trail.");
  }
  if (days60.length === 0) {
    days60.push("Improve evidence export capabilities for partner and examiner review.");
  }

  // 90 days: unified timeline + automation controls + packet generation
  if (hasAutomation(responses) && (scores.subScores.automationControls ?? 100) < 60) {
    days90.push("Implement threshold-based approval requirements for autonomous payment actions.");
    days90.push("Capture instruction context and override evidence for automated flows.");
  }
  if (scores.subScores.operationalResilience < 60) {
    days90.push("Build a unified case timeline for payment decision reconstruction.");
  }
  days90.push("Implement automated evidence packet generation for audit and partner diligence requests.");

  return { days30, days60, days90 };
}

function generatePacketPreview(scores: AssessmentScores, responses: Responses): PacketFieldStatus[] {
  const auto = hasAutomation(responses);
  const gapTags = scores.artifactGapTags;
  const blockerTags = scores.blockerTags;

  function fieldStatus(
    field: string,
    missingTag: string,
    blockerTag: string | null,
    conditional?: boolean
  ): PacketFieldStatus {
    if (gapTags.includes(missingTag)) return { field, status: "missing", conditional };
    if (blockerTag && blockerTags.includes(blockerTag)) return { field, status: "partial", conditional };
    // Default based on overall score
    if (scores.overallScore < 40) return { field, status: "missing", conditional };
    if (scores.overallScore < 70) return { field, status: "partial", conditional };
    return { field, status: "present", conditional };
  }

  const fields: PacketFieldStatus[] = [
    fieldStatus("Initiator type", "missing_initiator_type", "initiator_not_distinguishable"),
    fieldStatus("Policy version", "missing_policy_version", "no_policy_versioning"),
    fieldStatus("Screening timestamp", "missing_screening_timestamp", "weak_screening_proof"),
    fieldStatus("Approval lineage", "missing_approval_lineage", "approval_gap"),
    fieldStatus("Execution reference", "missing_execution_reference", null),
    fieldStatus("Exception disposition", "missing_exception_disposition", "weak_exception_handling"),
  ];

  if (auto) {
    fields.push(
      fieldStatus("Instruction context", "missing_instruction_context", "weak_autonomous_controls", true)
    );
  }

  return fields;
}

function generateNextBestAsset(scores: AssessmentScores, responses: Responses): Findings["nextBestAsset"] {
  const auto = hasAutomation(responses);

  if (scores.overallScore < 40) {
    return { href: "/bank-readiness-checklist", label: "View bank readiness checklist" };
  }
  if (scores.overallScore < 60) {
    if (auto) {
      return { href: "/sample-ai-initiated-payment-packet", label: "See an AI-initiated payment packet" };
    }
    return { href: "/sample-payment-decision-packet", label: "See a sample payment evidence packet" };
  }
  if (scores.overallScore < 80) {
    return { href: "/bank-readiness", label: "View bank readiness guide" };
  }
  if (auto) {
    return { href: "/why-ai-agents-moving-money-need-controls", label: "Why AI agents need controls" };
  }
  return { href: "/bank-readiness", label: "View bank readiness guide" };
}

export function generateFindings(
  responses: Responses,
  scores: AssessmentScores
): Findings {
  return {
    bluntSummary: generateBluntSummary(scores, responses),
    likelyReviewerBlockers: generateReviewerBlockers(scores, responses),
    likelyFailureModes: generateFailureModes(scores, responses),
    reviewerQuestionsAtRisk: generateReviewerQuestions(scores, responses),
    missingArtifacts: generateMissingArtifacts(scores, responses),
    teamImpacts: generateTeamImpacts(scores, responses),
    remediationPlan: generateRemediationPlan(scores, responses),
    packetPreview: generatePacketPreview(scores, responses),
    recommendedPacketFields: [
      "Initiator type (human / workflow / API / AI agent)",
      "Screening result with timestamp and list version",
      "Policy version applied at decision time",
      "Approval or override record with approver identity",
      "Execution reference (tx hash, payout ID, processor confirmation)",
      "Exception disposition and resolution",
      "Exportable evidence packet",
    ],
    nextBestAsset: generateNextBestAsset(scores, responses),
  };
}
