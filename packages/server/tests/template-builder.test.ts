// ============================================================================
// Template Builder Tests
// ============================================================================

import { describe, it, expect } from 'vitest';
import {
  TEMPLATES,
  getTemplate,
  type TemplateName,
  type NarrativeTemplate,
} from '../src/narrator/template-builder.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALL_TEMPLATE_NAMES: TemplateName[] = ['occ', 'cfpb', 'state_banking', 'mica', 'internal_audit'];

const REQUIRED_SECTIONS = [
  'transaction_summary',
  'sanctions_screening',
  'policy_evaluation',
  'trust_assessment',
  'tamper_evidence',
];

describe('NarrativeTemplates', () => {
  // --- All 5 templates exist ---

  it('TEMPLATES record contains exactly 5 templates', () => {
    expect(Object.keys(TEMPLATES)).toHaveLength(5);
  });

  it.each(ALL_TEMPLATE_NAMES)('template "%s" exists in TEMPLATES', (name) => {
    expect(TEMPLATES[name]).toBeDefined();
  });

  // --- getTemplate() ---

  it.each(ALL_TEMPLATE_NAMES)('getTemplate("%s") returns a valid template', (name) => {
    const tmpl = getTemplate(name);

    expect(tmpl).toBeDefined();
    expect(tmpl.name).toBe(name);
  });

  it('getTemplate() throws on unknown template name', () => {
    expect(() => getTemplate('nonexistent' as TemplateName)).toThrow(/Unknown narrative template/);
  });

  // --- Each template has a non-empty systemPrompt ---

  it.each(ALL_TEMPLATE_NAMES)('template "%s" has a non-empty systemPrompt', (name) => {
    const tmpl = getTemplate(name);

    expect(typeof tmpl.systemPrompt).toBe('string');
    expect(tmpl.systemPrompt.length).toBeGreaterThan(0);
  });

  // --- Each template has required sections array with 5 items ---

  it.each(ALL_TEMPLATE_NAMES)('template "%s" has requiredSections with 5 items', (name) => {
    const tmpl = getTemplate(name);

    expect(tmpl.requiredSections).toHaveLength(5);
  });

  it.each(ALL_TEMPLATE_NAMES)(
    'template "%s" requiredSections matches the canonical 5 sections',
    (name) => {
      const tmpl = getTemplate(name);

      expect(tmpl.requiredSections).toEqual(REQUIRED_SECTIONS);
    },
  );

  // --- Templates have distinct system prompts ---

  it('all templates have distinct systemPrompts (no duplicates)', () => {
    const prompts = ALL_TEMPLATE_NAMES.map((n) => getTemplate(n).systemPrompt);
    const unique = new Set(prompts);

    expect(unique.size).toBe(prompts.length);
  });

  // --- Each template has sectionEmphasis for all required sections ---

  it.each(ALL_TEMPLATE_NAMES)(
    'template "%s" has sectionEmphasis for every required section',
    (name) => {
      const tmpl = getTemplate(name);

      for (const section of REQUIRED_SECTIONS) {
        expect(tmpl.sectionEmphasis[section]).toBeDefined();
        expect(typeof tmpl.sectionEmphasis[section]).toBe('string');
        expect(tmpl.sectionEmphasis[section]!.length).toBeGreaterThan(0);
      }
    },
  );

  // --- Template has displayName ---

  it.each(ALL_TEMPLATE_NAMES)('template "%s" has a non-empty displayName', (name) => {
    const tmpl = getTemplate(name);

    expect(typeof tmpl.displayName).toBe('string');
    expect(tmpl.displayName.length).toBeGreaterThan(0);
  });

  // --- Template-specific content checks ---

  it('OCC template references BSA/AML', () => {
    const tmpl = getTemplate('occ');
    expect(tmpl.systemPrompt).toContain('BSA');
  });

  it('CFPB template references Regulation E', () => {
    const tmpl = getTemplate('cfpb');
    expect(tmpl.systemPrompt).toContain('Regulation E');
  });

  it('state_banking template references GENIUS Act', () => {
    const tmpl = getTemplate('state_banking');
    expect(tmpl.systemPrompt).toContain('GENIUS Act');
  });

  it('MiCA template references MiCA regulation', () => {
    const tmpl = getTemplate('mica');
    expect(tmpl.systemPrompt).toContain('MiCA');
  });

  it('internal_audit template references internal auditor role', () => {
    const tmpl = getTemplate('internal_audit');
    expect(tmpl.systemPrompt).toContain('internal auditor');
  });

  // --- getTemplate returns same object as TEMPLATES record ---

  it.each(ALL_TEMPLATE_NAMES)('getTemplate("%s") returns the same object as TEMPLATES["%s"]', (name) => {
    expect(getTemplate(name)).toBe(TEMPLATES[name]);
  });
});
