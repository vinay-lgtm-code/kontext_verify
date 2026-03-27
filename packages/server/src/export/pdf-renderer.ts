// ============================================================================
// Kontext Server — PDF Renderer (Server-Side Evidence PDF Generation)
// ============================================================================
// Uses @react-pdf/renderer to produce compliance-ready PDF documents.
// Each PDF includes: branded header, digest chain summary, per-event evidence cards.

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from '@react-pdf/renderer';
import type { ExportTemplate } from './templates.js';

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#1a1a1a',
  },
  header: {
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#1a1a1a',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#555555',
  },
  headerMeta: {
    fontSize: 8,
    color: '#888888',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 8,
    marginTop: 16,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#cccccc',
  },
  digestSummary: {
    backgroundColor: '#f5f5f5',
    padding: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#dddddd',
  },
  digestRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  digestLabel: {
    fontFamily: 'Helvetica-Bold',
    width: 140,
    fontSize: 8,
  },
  digestValue: {
    fontSize: 8,
    flex: 1,
    fontFamily: 'Courier',
  },
  eventCard: {
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  eventId: {
    fontSize: 8,
    fontFamily: 'Courier',
    color: '#555555',
  },
  eventStatus: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
  },
  cardSection: {
    marginBottom: 6,
  },
  cardSectionTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#333333',
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  fieldRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  fieldLabel: {
    width: 130,
    fontSize: 8,
    color: '#666666',
  },
  fieldValue: {
    fontSize: 8,
    flex: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7,
    color: '#999999',
  },
  statusVerified: { color: '#16a34a' },
  statusWarning: { color: '#d97706' },
  statusBlocked: { color: '#dc2626' },
});

// ---------------------------------------------------------------------------
// Helper components
// ---------------------------------------------------------------------------

function Field({ label, value }: { label: string; value: unknown }) {
  const display = value === null || value === undefined ? '-' : String(value);
  return React.createElement(
    View,
    { style: styles.fieldRow },
    React.createElement(Text, { style: styles.fieldLabel }, label),
    React.createElement(Text, { style: styles.fieldValue }, display),
  );
}

function CardSection({ title, fields }: { title: string; fields: Array<{ label: string; value: unknown }> }) {
  return React.createElement(
    View,
    { style: styles.cardSection },
    React.createElement(Text, { style: styles.cardSectionTitle }, title),
    ...fields.map((f, i) =>
      React.createElement(Field, { key: i, label: f.label, value: f.value }),
    ),
  );
}

// ---------------------------------------------------------------------------
// Status color helper
// ---------------------------------------------------------------------------

function statusStyle(status: string) {
  if (status === 'verified') return styles.statusVerified;
  if (status === 'warning') return styles.statusWarning;
  if (status === 'blocked') return styles.statusBlocked;
  return {};
}

// ---------------------------------------------------------------------------
// PDF Document component
// ---------------------------------------------------------------------------

interface DigestSummary {
  genesisHash: string;
  terminalDigest: string;
  chainLength: number;
  verified: boolean;
}

function EvidencePDFDocument({
  events,
  template,
  orgName,
  digestSummary,
}: {
  events: Record<string, unknown>[];
  template: string;
  orgName: string;
  digestSummary: DigestSummary | null;
}) {
  const generatedAt = new Date().toISOString();
  const pageCount = events.length;

  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: 'A4', style: styles.page },

      // -- Header
      React.createElement(
        View,
        { style: styles.header },
        React.createElement(Text, { style: styles.headerTitle }, 'Kontext Evidence Export'),
        React.createElement(
          Text,
          { style: styles.headerSubtitle },
          `${orgName} | Template: ${template} | ${pageCount} event${pageCount !== 1 ? 's' : ''}`,
        ),
        React.createElement(
          Text,
          { style: styles.headerMeta },
          `Generated: ${generatedAt} | Kontext Compliance Platform | US Patent 12,463,819 B1`,
        ),
      ),

      // -- Digest Chain Summary
      ...(digestSummary
        ? [
            React.createElement(Text, { style: styles.sectionTitle, key: 'digest-title' }, 'Digest Chain Summary'),
            React.createElement(
              View,
              { style: styles.digestSummary, key: 'digest-box' },
              React.createElement(
                View,
                { style: styles.digestRow },
                React.createElement(Text, { style: styles.digestLabel }, 'Genesis Hash:'),
                React.createElement(Text, { style: styles.digestValue }, digestSummary.genesisHash),
              ),
              React.createElement(
                View,
                { style: styles.digestRow },
                React.createElement(Text, { style: styles.digestLabel }, 'Terminal Digest:'),
                React.createElement(Text, { style: styles.digestValue }, digestSummary.terminalDigest),
              ),
              React.createElement(
                View,
                { style: styles.digestRow },
                React.createElement(Text, { style: styles.digestLabel }, 'Chain Length:'),
                React.createElement(Text, { style: styles.digestValue }, String(digestSummary.chainLength)),
              ),
              React.createElement(
                View,
                { style: styles.digestRow },
                React.createElement(Text, { style: styles.digestLabel }, 'Verification Status:'),
                React.createElement(
                  Text,
                  { style: { ...styles.digestValue, color: digestSummary.verified ? '#16a34a' : '#dc2626' } },
                  digestSummary.verified ? 'CHAIN INTACT' : 'CHAIN BROKEN',
                ),
              ),
            ),
          ]
        : []),

      // -- Events
      React.createElement(Text, { style: styles.sectionTitle }, 'Evidence Records'),

      ...events.map((evt, idx) =>
        React.createElement(
          View,
          { style: styles.eventCard, key: idx, wrap: false },

          // Event header
          React.createElement(
            View,
            { style: styles.eventHeader },
            React.createElement(Text, { style: styles.eventId }, String(evt['event_id'] ?? `#${idx + 1}`)),
            React.createElement(
              Text,
              { style: { ...styles.eventStatus, ...statusStyle(String(evt['status'] ?? '')) } },
              String(evt['status'] ?? 'unknown').toUpperCase(),
            ),
          ),

          // Payment Details
          React.createElement(CardSection, {
            title: 'Payment Details',
            fields: [
              { label: 'Transaction Hash', value: evt['payment_tx_hash'] ?? evt['exec_tx_hash'] },
              { label: 'Chain', value: evt['payment_chain'] },
              { label: 'Token', value: evt['payment_token'] },
              { label: 'Amount', value: evt['payment_amount'] },
              { label: 'USD Equivalent', value: evt['payment_usd_equivalent'] },
              { label: 'From', value: evt['payment_from_address'] },
              { label: 'To', value: evt['payment_to_address'] },
            ],
          }),

          // Screening Results
          React.createElement(CardSection, {
            title: 'Screening Results',
            fields: [
              { label: 'OFAC Status', value: evt['ofac_status'] },
              { label: 'Screening Provider', value: evt['screening_provider'] ?? evt['eb_screening_provider'] },
              { label: 'Screening Result', value: evt['screening_result'] },
              { label: 'Screened At', value: evt['screened_at'] ?? evt['screening_screened_at'] },
            ],
          }),

          // Policy Evaluation
          React.createElement(CardSection, {
            title: 'Policy Evaluation',
            fields: [
              { label: 'Decision', value: evt['policy_decision'] },
              { label: 'Violations', value: evt['policy_violations'] },
              { label: 'Warnings', value: evt['policy_warnings'] },
              { label: 'Trust Score', value: evt['trust_score'] },
              { label: 'Trust Band', value: evt['trust_band'] },
            ],
          }),

          // Cryptographic Proof
          ...(evt['record_hash']
            ? [
                React.createElement(CardSection, {
                  key: `proof-${idx}`,
                  title: 'Cryptographic Proof',
                  fields: [
                    { label: 'Record Hash', value: evt['record_hash'] },
                    { label: 'Previous Hash', value: evt['previous_record_hash'] },
                    { label: 'Chain Index', value: evt['chain_index'] },
                  ],
                }),
              ]
            : []),
        ),
      ),

      // -- Footer
      React.createElement(
        View,
        { style: styles.footer, fixed: true },
        React.createElement(Text, null, 'Kontext Compliance Platform'),
        React.createElement(Text, null, `Generated ${generatedAt}`),
      ),
    ),
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Render an array of evidence events into a compliance-ready PDF buffer.
 *
 * @param events      Transformed row objects (from template.transformRow)
 * @param template    Template name used (for header display)
 * @param orgName     Organization name for branding
 * @param digestSummary Optional digest chain summary for the chain integrity section
 * @returns           PDF as a Buffer
 */
export async function renderEvidencePDF(
  events: Record<string, unknown>[],
  template: string,
  orgName: string,
  digestSummary?: DigestSummary | null,
): Promise<Buffer> {
  const doc = React.createElement(EvidencePDFDocument, {
    events,
    template,
    orgName,
    digestSummary: digestSummary ?? null,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(doc as any);
  return Buffer.from(buffer);
}
