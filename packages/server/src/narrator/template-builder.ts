// ============================================================================
// Kontext Server — Narrative Template Builder
// ============================================================================
// 5 regulatory templates for AI evidence narration. Each defines a system
// prompt, required sections, and section-level emphasis for the LLM.

export type TemplateName = 'occ' | 'cfpb' | 'state_banking' | 'mica' | 'internal_audit';

export interface NarrativeTemplate {
  name: TemplateName;
  displayName: string;
  systemPrompt: string;
  requiredSections: string[];
  sectionEmphasis: Record<string, string>;
}

const REQUIRED_SECTIONS = [
  'transaction_summary',
  'sanctions_screening',
  'policy_evaluation',
  'trust_assessment',
  'tamper_evidence',
] as const;

const OCC_TEMPLATE: NarrativeTemplate = {
  name: 'occ',
  displayName: 'OCC Examination Narrative',
  systemPrompt:
    'You are a compliance analyst preparing a narrative for OCC bank examiners. ' +
    'Write in formal regulatory prose. Reference 12 CFR 21.11 (BSA) and OCC Bulletin 2023-37 where relevant. ' +
    'Focus on demonstrating adequate BSA/AML controls and suspicious activity identification procedures.',
  requiredSections: [...REQUIRED_SECTIONS],
  sectionEmphasis: {
    transaction_summary: 'Include BSA threshold analysis ($3K Travel Rule, $10K CTR).',
    sanctions_screening: 'Detail OFAC SDN screening methodology and results.',
    policy_evaluation: 'Map policy rules to OCC safety-and-soundness standards.',
    trust_assessment: 'Explain agent trust score factors and risk band classification.',
    tamper_evidence: 'Describe digest chain integrity verification and hash linkage.',
  },
};

const CFPB_TEMPLATE: NarrativeTemplate = {
  name: 'cfpb',
  displayName: 'CFPB Consumer Protection Narrative',
  systemPrompt:
    'You are a compliance analyst preparing a narrative for CFPB examiners. ' +
    'Write in clear, consumer-focused regulatory language. Reference Regulation E (12 CFR 1005) ' +
    'and the Electronic Fund Transfer Act. Focus on consumer protection, error resolution, and disclosure adequacy.',
  requiredSections: [...REQUIRED_SECTIONS],
  sectionEmphasis: {
    transaction_summary: 'Highlight consumer-facing transaction details and disclosure compliance.',
    sanctions_screening: 'Note consumer notification procedures if screening flags arise.',
    policy_evaluation: 'Assess whether policies protect consumer rights under Reg E.',
    trust_assessment: 'Evaluate agent reliability from a consumer harm perspective.',
    tamper_evidence: 'Confirm records support error resolution and dispute timelines.',
  },
};

const STATE_BANKING_TEMPLATE: NarrativeTemplate = {
  name: 'state_banking',
  displayName: 'State Banking Department Narrative',
  systemPrompt:
    'You are a compliance analyst preparing a narrative for state banking regulators. ' +
    'Write in formal regulatory language. Reference the GENIUS Act (S. 1582, signed July 2025) ' +
    'and applicable state money transmitter laws. Focus on licensing compliance and consumer fund safeguarding.',
  requiredSections: [...REQUIRED_SECTIONS],
  sectionEmphasis: {
    transaction_summary: 'Include state-specific threshold analysis and fund flow documentation.',
    sanctions_screening: 'Detail compliance with state-mandated screening requirements.',
    policy_evaluation: 'Map policies to state examination standards and licensing conditions.',
    trust_assessment: 'Present agent scoring as evidence of ongoing monitoring.',
    tamper_evidence: 'Demonstrate audit trail immutability for state record-keeping requirements.',
  },
};

const MICA_TEMPLATE: NarrativeTemplate = {
  name: 'mica',
  displayName: 'EU MiCA Compliance Narrative',
  systemPrompt:
    'You are a compliance analyst preparing a narrative for EU regulators under MiCA (Markets in Crypto-Assets Regulation). ' +
    'Write in formal EU regulatory prose. Reference MiCA Articles 62-65 (asset-referenced tokens) ' +
    'and EBA guidelines on stablecoin reserves. Focus on prudential requirements and consumer disclosure.',
  requiredSections: [...REQUIRED_SECTIONS],
  sectionEmphasis: {
    transaction_summary: 'Frame transaction within MiCA classification of crypto-asset services.',
    sanctions_screening: 'Reference EU AML Directive 6 (AMLD6) screening obligations.',
    policy_evaluation: 'Map policies to MiCA organizational requirements (Article 68).',
    trust_assessment: 'Present agent governance as part of MiCA operational resilience.',
    tamper_evidence: 'Demonstrate record-keeping compliance with MiCA Article 72.',
  },
};

const INTERNAL_AUDIT_TEMPLATE: NarrativeTemplate = {
  name: 'internal_audit',
  displayName: 'Internal Audit Narrative',
  systemPrompt:
    'You are an internal auditor preparing a narrative for management review. ' +
    'Write in concise professional language. Focus on control effectiveness, exception identification, ' +
    'and remediation recommendations. Reference internal risk appetite frameworks.',
  requiredSections: [...REQUIRED_SECTIONS],
  sectionEmphasis: {
    transaction_summary: 'Summarize transaction parameters and any threshold breaches.',
    sanctions_screening: 'Assess screening control effectiveness and false-positive rates.',
    policy_evaluation: 'Evaluate policy rule coverage and identify control gaps.',
    trust_assessment: 'Analyze trust score trends and outlier behavior.',
    tamper_evidence: 'Verify audit trail completeness and chain-of-custody integrity.',
  },
};

export const TEMPLATES: Record<TemplateName, NarrativeTemplate> = {
  occ: OCC_TEMPLATE,
  cfpb: CFPB_TEMPLATE,
  state_banking: STATE_BANKING_TEMPLATE,
  mica: MICA_TEMPLATE,
  internal_audit: INTERNAL_AUDIT_TEMPLATE,
};

export function getTemplate(name: TemplateName): NarrativeTemplate {
  const tmpl = TEMPLATES[name];
  if (!tmpl) {
    throw new Error(`Unknown narrative template: ${name}`);
  }
  return tmpl;
}
