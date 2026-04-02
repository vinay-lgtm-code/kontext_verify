const sourceSystems = [
  {
    title: "Approval tools",
    detail: "Slack, Jira, email, internal workflows",
  },
  {
    title: "Screening systems",
    detail: "OFAC, TRM, Chainalysis, internal checks",
  },
  {
    title: "Transaction records",
    detail: "Stripe, Moov, ledgers, banking rails",
  },
  {
    title: "Agent and workflow logs",
    detail: "AI agents, orchestration, API-triggered actions",
  },
];

const kontextAssembly = [
  "Unified evidence assembly",
  "Policy evaluation",
  "Screening evidence",
  "Approval lineage",
  "Verifiable audit proof",
];

const outputs = [
  {
    title: "Evidence packet",
    detail: "PDF / JSON / CSV",
  },
  {
    title: "Compliance certificate",
    detail: "Tamper-evident proof",
  },
  {
    title: "Audit trail",
    detail: "Reviewer-ready record",
  },
];

function DiagramCard({
  title,
  detail,
}: {
  title: string;
  detail?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--ic-border)] bg-[var(--ic-surface)] px-4 py-4 shadow-[0_12px_40px_rgba(0,0,0,0.18)]">
      <p className="text-[15px] font-semibold text-[var(--ic-text)]">{title}</p>
      {detail ? (
        <p className="mt-1 text-[12px] leading-relaxed text-[var(--ic-text-muted)]">
          {detail}
        </p>
      ) : null}
    </div>
  );
}

function FlowConnector() {
  return (
    <div className="flex items-center justify-center py-2 lg:hidden">
      <div className="h-10 w-px bg-[var(--ic-border)]" />
    </div>
  );
}

export function EvidenceFlowDiagram() {
  return (
    <section className="relative px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-2xl border border-[var(--ic-border)] bg-[var(--ic-surface-2)] px-6 py-10 shadow-[0_0_0_1px_rgba(59,110,248,0.04),0_24px_80px_rgba(0,0,0,0.28)] sm:px-8 sm:py-12 lg:px-10">
          <div className="text-center">
            <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
              Evidence Assembly
            </span>
            <h2 className="mt-4 font-serif text-3xl font-normal leading-tight tracking-tight text-[var(--ic-text)] sm:text-4xl">
              From fragmented systems to examiner-ready proof
            </h2>
            <p className="mx-auto mt-4 max-w-3xl text-[16px] leading-relaxed text-[var(--ic-text-muted)]">
              Kontext sits between the systems you already use and the evidence
              reviewers actually need, assembling one defensible record from
              approvals, screening, transaction activity, and agent workflows.
            </p>
          </div>

          <div className="mt-10">
            <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start lg:gap-12">
              <div>
              <div className="mb-4">
                <span className="inline-flex rounded-full border border-[var(--ic-border)] bg-[var(--ic-surface)] px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--ic-text-dim)]">
                  Your systems
                </span>
              </div>
              <div className="space-y-4">
                {sourceSystems.map((item) => (
                  <DiagramCard
                    key={item.title}
                    title={item.title}
                    detail={item.detail}
                  />
                ))}
              </div>
              </div>

              <FlowConnector />

              <div>
              <div className="mb-4">
                <span className="inline-flex rounded-full border border-[var(--ic-accent)] bg-[var(--ic-accent)] px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-white">
                  Kontext
                </span>
              </div>
              <div className="rounded-2xl border border-[rgba(59,110,248,0.28)] bg-[var(--ic-accent-dim)] px-5 py-5 shadow-[0_0_0_1px_rgba(59,110,248,0.08),0_18px_48px_rgba(59,110,248,0.12)]">
                <div className="rounded-xl border border-[var(--ic-border)] bg-[var(--ic-surface)] px-4 py-4">
                  <p className="text-[16px] font-semibold text-[var(--ic-text)]">
                    Unified evidence assembly
                  </p>
                  <p className="mt-1 text-[12px] leading-relaxed text-[var(--ic-text-muted)]">
                    Kontext assembles the review trail across policy decisions,
                    sanctions evidence, approvals, and execution context.
                  </p>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {kontextAssembly.map((item) => (
                    <div
                      key={item}
                      className="rounded-xl border border-[var(--ic-border)] bg-[var(--ic-surface-3)] px-3 py-3 text-[13px] font-medium text-[var(--ic-text)]"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              </div>

              <FlowConnector />

              <div>
              <div className="mb-4">
                <span className="inline-flex rounded-full border border-[var(--ic-border)] bg-[var(--ic-surface)] px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--ic-text-dim)]">
                  Examiner-ready output
                </span>
              </div>
              <div className="space-y-4">
                {outputs.map((item) => (
                  <DiagramCard
                    key={item.title}
                    title={item.title}
                    detail={item.detail}
                  />
                ))}
              </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
