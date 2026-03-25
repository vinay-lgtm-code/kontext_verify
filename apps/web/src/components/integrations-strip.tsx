import Link from "next/link";

const categories = [
  { name: "Observability", count: 3 },
  { name: "Screening + Risk", count: 4 },
  { name: "Case Systems / GRC", count: 3 },
  { name: "Processors / Ledgers / Wallets", count: 5 },
  { name: "Workflow + Agent Orchestration", count: 3 },
];

export function IntegrationsStrip() {
  return (
    <section className="relative border-t border-[var(--ic-border)] bg-[var(--ic-surface-2)] px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
            Integrations
          </span>
          <p className="mt-2 text-[15px] text-[var(--ic-text-muted)]">
            Kontext does not replace your monitoring or detection stack. It adds
            the compliance evidence and verification layer they lack.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {categories.map((cat) => (
            <Link
              key={cat.name}
              href="/integrations"
              className="inline-flex items-center gap-2 rounded-full border border-[var(--ic-border)] bg-[hsl(var(--background))] px-4 py-2 text-[13px] text-[var(--ic-text-muted)] transition-colors hover:border-[var(--ic-accent)]/30 hover:text-[var(--ic-text)]"
            >
              {cat.name}
              <span className="rounded-full bg-[var(--ic-accent-dim)] px-1.5 py-0.5 font-mono text-[9px] font-semibold text-[var(--ic-accent)]">
                {cat.count}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
