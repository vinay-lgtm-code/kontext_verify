export interface QuestionOption {
  value: string;
  label: string;
}

export interface AssessmentQuestion {
  id: string;
  type: "single_select" | "multi_select";
  prompt: string;
  helpText?: string;
  required: boolean;
  options: QuestionOption[];
}

export interface AssessmentSection {
  id: string;
  title: string;
  questions: AssessmentQuestion[];
}

export const assessmentSections: AssessmentSection[] = [
  {
    id: "context",
    title: "Flow context",
    questions: [
      {
        id: "flow_type",
        type: "single_select",
        prompt: "Which flow do you want to assess?",
        required: true,
        options: [
          { value: "stablecoin_payout", label: "Stablecoin payout" },
          { value: "treasury_transfer", label: "Treasury transfer" },
          { value: "cross_border_vendor_payment", label: "Cross-border vendor payment" },
          { value: "wallet_disbursement", label: "Wallet-based disbursement" },
          { value: "card_funding_or_payout", label: "Card funding / card payout" },
          { value: "ach_or_bank_transfer", label: "ACH / bank transfer" },
          { value: "internal_transfer_or_sweep", label: "Internal transfer / sweep" },
          { value: "other", label: "Other programmable payment flow" },
        ],
      },
      {
        id: "automation_level",
        type: "single_select",
        prompt: "Which best describes this flow?",
        required: true,
        options: [
          { value: "fully_automated", label: "Fully automated" },
          { value: "agent_initiated_with_guardrails", label: "Agent-initiated with guardrails" },
          { value: "rule_based_with_human_review", label: "Rule-based with occasional human review" },
          { value: "mostly_manual_with_software_assistance", label: "Mostly manual with software assistance" },
          { value: "mostly_manual", label: "Mostly manual" },
        ],
      },
      {
        id: "rails",
        type: "multi_select",
        prompt: "Which rails are involved?",
        required: true,
        options: [
          { value: "stablecoin", label: "Stablecoin" },
          { value: "internal_wallet_ledger", label: "Internal wallet ledger" },
          { value: "ach", label: "ACH" },
          { value: "wire", label: "Wire" },
          { value: "rtp_or_instant", label: "RTP / instant payments" },
          { value: "card_rails", label: "Card rails" },
          { value: "cross_border_provider", label: "Cross-border payout provider" },
          { value: "other", label: "Other" },
        ],
      },
      {
        id: "systems_touched",
        type: "multi_select",
        prompt: "Which systems touch this flow today?",
        required: true,
        options: [
          { value: "wallet_provider", label: "Wallet provider" },
          { value: "payment_processor_or_payout_api", label: "Payment processor / payout API" },
          { value: "treasury_orchestration", label: "Treasury / orchestration platform" },
          { value: "sanctions_screening_vendor", label: "Sanctions / screening vendor" },
          { value: "ledger_or_warehouse", label: "Ledger / warehouse" },
          { value: "case_management", label: "Case management / investigations" },
          { value: "ticketing_or_approvals", label: "Ticketing / approvals workflow" },
          { value: "siem_or_logging", label: "SIEM / logging system" },
          { value: "other", label: "Other" },
        ],
      },
      {
        id: "stakeholder_teams",
        type: "multi_select",
        prompt: "Which teams need to review or understand this flow?",
        required: true,
        options: [
          { value: "compliance", label: "Compliance" },
          { value: "risk_or_fraud", label: "Risk / fraud" },
          { value: "internal_audit", label: "Internal audit" },
          { value: "security_or_platform_ops", label: "Security / platform ops" },
          { value: "finance_or_treasury", label: "Finance / treasury" },
          { value: "product_or_engineering", label: "Product / engineering" },
        ],
      },
    ],
  },
  {
    id: "evidence",
    title: "Evidence capture",
    questions: [
      {
        id: "capture_payment_intent",
        type: "single_select",
        prompt: "Do you capture the original payment intent?",
        helpText: "Examples: initiator, purpose, workflow, amount, recipient, justification",
        required: true,
        options: [
          { value: "yes_always_one_place", label: "Yes, always and in one place" },
          { value: "yes_inconsistently", label: "Yes, but inconsistently" },
          { value: "app_logs_only", label: "Captured in app logs only" },
          { value: "usually_not_captured", label: "Usually not captured" },
          { value: "not_sure", label: "Not sure" },
        ],
      },
      {
        id: "identify_initiator",
        type: "single_select",
        prompt: "Can you identify who or what initiated the payment?",
        required: true,
        options: [
          { value: "exact_user_service_agent_workflow_id", label: "Yes, exact user / service / agent / workflow ID" },
          { value: "usually_yes", label: "Usually yes" },
          { value: "sometimes", label: "Sometimes" },
          { value: "rarely", label: "Rarely" },
          { value: "no", label: "No" },
        ],
      },
      {
        id: "screening_policy_results_linked",
        type: "single_select",
        prompt: "Are screening or policy results retained with the payment record?",
        required: true,
        options: [
          { value: "full_results_linked", label: "Yes, full results and timestamps are linked" },
          { value: "partial_results_linked", label: "Partial results are linked" },
          { value: "results_in_other_system", label: "Results exist but in another system" },
          { value: "pass_fail_only", label: "Only pass/fail is retained" },
          { value: "no_or_not_sure", label: "No / not sure" },
        ],
      },
      {
        id: "policy_version_known",
        type: "single_select",
        prompt: "Can you tell which policy or rules version was applied?",
        required: true,
        options: [
          { value: "exact_policy_version", label: "Yes, exact policy/version" },
          { value: "policy_name_only", label: "Policy name only" },
          { value: "inferred_manually", label: "Inferred manually" },
          { value: "no", label: "No" },
          { value: "not_sure", label: "Not sure" },
        ],
      },
      {
        id: "approvals_linked",
        type: "single_select",
        prompt: "Are approvals, overrides, or exceptions linked to the payment?",
        required: true,
        options: [
          { value: "yes_fully_linked", label: "Yes, fully linked" },
          { value: "linked_for_some_flows", label: "Linked for some flows" },
          { value: "tracked_in_slack_email_tickets_only", label: "Tracked in Slack / email / tickets only" },
          { value: "rarely", label: "Rarely" },
          { value: "no", label: "No" },
        ],
      },
      {
        id: "execution_linkage",
        type: "single_select",
        prompt: "Is execution evidence linked back to the decision?",
        helpText: "Examples: tx hash, payout ID, processor reference, ledger entry, bank confirmation",
        required: true,
        options: [
          { value: "yes_automatically", label: "Yes, automatically" },
          { value: "yes_manually", label: "Yes, manually" },
          { value: "sometimes", label: "Sometimes" },
          { value: "rarely", label: "Rarely" },
          { value: "no", label: "No" },
        ],
      },
    ],
  },
  {
    id: "replay",
    title: "Replay and audit readiness",
    questions: [
      {
        id: "systems_to_check_for_challenge",
        type: "single_select",
        prompt: "If compliance challenges a payment, how many systems must your team check?",
        required: true,
        options: [
          { value: "1", label: "1" },
          { value: "2", label: "2" },
          { value: "3", label: "3" },
          { value: "4_plus", label: "4+" },
          { value: "not_sure", label: "Not sure" },
        ],
      },
      {
        id: "packet_under_30_minutes",
        type: "single_select",
        prompt: "Could your team produce an evidence packet for one challenged payment in under 30 minutes?",
        required: true,
        options: [
          { value: "yes_easily", label: "Yes, easily" },
          { value: "usually", label: "Usually" },
          { value: "sometimes", label: "Sometimes" },
          { value: "rarely", label: "Rarely" },
          { value: "no", label: "No" },
        ],
      },
      {
        id: "evidence_storage_state",
        type: "single_select",
        prompt: "How are logs/evidence stored today?",
        required: true,
        options: [
          { value: "unified_and_queryable", label: "Unified and queryable" },
          { value: "split_across_2_3_systems", label: "Split across 2\u20133 systems" },
          { value: "spread_across_4_plus_systems", label: "Spread across 4+ systems" },
          { value: "mostly_raw_logs", label: "Mostly raw logs" },
          { value: "mostly_ad_hoc_manual", label: "Mostly ad hoc/manual" },
        ],
      },
      {
        id: "tamper_evident_records",
        type: "single_select",
        prompt: "Do you have tamper-evident or integrity-verifiable records for decision history?",
        required: true,
        options: [
          { value: "yes", label: "Yes" },
          { value: "partially", label: "Partially" },
          { value: "planned", label: "Planned" },
          { value: "no", label: "No" },
          { value: "not_sure", label: "Not sure" },
        ],
      },
      {
        id: "pain_last_12_months",
        type: "multi_select",
        prompt: "Which of these caused pain in the last 12 months?",
        required: true,
        options: [
          { value: "audit_requests", label: "Audit requests" },
          { value: "partner_or_bank_diligence", label: "Partner / bank diligence" },
          { value: "sanctions_or_compliance_review", label: "Sanctions / compliance review" },
          { value: "fraud_investigation", label: "Fraud investigation" },
          { value: "payment_dispute_or_failure_analysis", label: "Payment dispute / failure analysis" },
          { value: "internal_control_review", label: "Internal control review" },
          { value: "slow_incident_response", label: "Slow incident response" },
          { value: "none_yet", label: "None yet" },
        ],
      },
    ],
  },
];

export const totalQuestions = assessmentSections.reduce(
  (sum, s) => sum + s.questions.length,
  0
);
