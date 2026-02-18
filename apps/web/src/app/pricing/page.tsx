import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Kontext pricing — 20,000 events free forever. Pay as you go at $2.00 per 1,000 events after the free tier. No monthly minimum.",
};

// ---------------------------------------------------------------------------
// Feature comparison table data
// ---------------------------------------------------------------------------

type FeatureRow = {
  category: string;
  feature: string;
  free: string | boolean;
  payg: string | boolean;
};

const featureRows: FeatureRow[] = [
  // Events
  { category: "Events", feature: "Included events / month", free: "20,000", payg: "20,000 free" },
  { category: "Events", feature: "Additional events", free: false, payg: "$2.00 / 1K events" },
  // Chains
  { category: "Chains", feature: "Base", free: true, payg: true },
  { category: "Chains", feature: "All 8 chains (Ethereum, Polygon, Arbitrum, Optimism, Arc, Avalanche, Solana)", free: false, payg: "after $5 spend" },
  // Core methods
  { category: "Core", feature: "verify()", free: true, payg: true },
  { category: "Core", feature: "logReasoning()", free: true, payg: true },
  { category: "Core", feature: "createTask() / confirmTask()", free: true, payg: true },
  { category: "Core", feature: "Digest chain (tamper-evident)", free: true, payg: true },
  // Trust & anomaly
  { category: "Trust & Compliance", feature: "Trust scoring (0–100, 5 factors)", free: true, payg: true },
  { category: "Trust & Compliance", feature: "Compliance certificates", free: true, payg: true },
  { category: "Trust & Compliance", feature: "Basic anomaly detection (unusualAmount, frequencySpike)", free: true, payg: true },
  { category: "Trust & Compliance", feature: "Advanced anomaly detection (4 rules)", free: false, payg: "$0.10 / anomaly" },
  // Audit
  { category: "Audit Trails", feature: "JSON audit export", free: true, payg: true },
  { category: "Audit Trails", feature: "CSV audit export", free: false, payg: true },
  { category: "Audit Trails", feature: "OFAC SDN screening (built-in)", free: true, payg: true },
  // Storage
  { category: "Storage", feature: "In-memory storage", free: true, payg: true },
  { category: "Storage", feature: "File storage (local)", free: true, payg: true },
  { category: "Storage", feature: "Cloud persistence (Firestore)", free: false, payg: true },
  // Support
  { category: "Support", feature: "GitHub support", free: true, payg: true },
  { category: "Support", feature: "Email support", free: false, payg: true },
];

// Cost calculator breakpoints
const costBreakpoints = [
  { label: "50K events", events: 50_000, cost: 0.06 },
  { label: "250K events", events: 250_000, cost: 0.46 },
  { label: "1M events", events: 1_000_000, cost: 1.96 },
  { label: "5M events", events: 5_000_000, cost: 9.96 },
];

function renderCell(value: string | boolean) {
  if (value === true) {
    return (
      <span className="inline-flex items-center justify-center">
        <Badge variant="green" className="text-xs">✓</Badge>
      </span>
    );
  }
  if (value === false) {
    return <span className="text-black/30 font-bold">—</span>;
  }
  return <Badge variant="yellow" className="text-xs font-mono">{value}</Badge>;
}

const categories = Array.from(new Set(featureRows.map((r) => r.category)));

export default function PricingPage() {
  return (
    <div className="bg-bg">
      {/* Header */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="text-center mb-16">
          <Badge variant="green" className="mb-4">Pricing</Badge>
          <h1 className="text-4xl sm:text-5xl font-bold text-black mb-4">
            Simple, honest pricing
          </h1>
          <p className="text-lg text-black/70 max-w-xl mx-auto">
            First 20,000 events are free forever. No credit card. No monthly minimum.
            Pay only for what you use beyond the free tier.
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
          {/* Free */}
          <div className="rounded-base border-2 border-black bg-white p-8 shadow-shadow flex flex-col">
            <div className="mb-6">
              <p className="text-xs font-bold uppercase tracking-widest text-black/40 mb-2">Free</p>
              <div className="flex items-end gap-2 mb-1">
                <span className="text-5xl font-bold text-black">$0</span>
                <span className="text-black/50 mb-2">/mo forever</span>
              </div>
              <p className="text-sm text-black/60">20,000 events included. No credit card required.</p>
            </div>
            <ul className="space-y-3 flex-1 mb-8 text-sm">
              <li className="flex items-start gap-2 text-black/70">
                <Badge variant="green" className="mt-0.5 shrink-0">✓</Badge>
                20,000 events/mo always free
              </li>
              <li className="flex items-start gap-2 text-black/70">
                <Badge variant="green" className="mt-0.5 shrink-0">✓</Badge>
                verify(), logReasoning(), createTask()
              </li>
              <li className="flex items-start gap-2 text-black/70">
                <Badge variant="green" className="mt-0.5 shrink-0">✓</Badge>
                Trust scoring + compliance certificates
              </li>
              <li className="flex items-start gap-2 text-black/70">
                <Badge variant="green" className="mt-0.5 shrink-0">✓</Badge>
                Basic anomaly detection (2 rules)
              </li>
              <li className="flex items-start gap-2 text-black/70">
                <Badge variant="green" className="mt-0.5 shrink-0">✓</Badge>
                JSON audit export + digest chain
              </li>
              <li className="flex items-start gap-2 text-black/70">
                <Badge variant="green" className="mt-0.5 shrink-0">✓</Badge>
                Base chain, in-memory + file storage
              </li>
            </ul>
            <Button variant="secondary" size="lg" className="w-full" asChild>
              <Link href="/docs">Get started free</Link>
            </Button>
          </div>

          {/* Pay as you go */}
          <div className="rounded-base border-2 border-black bg-main p-8 shadow-shadow flex flex-col">
            <div className="mb-6">
              <p className="text-xs font-bold uppercase tracking-widest text-black/60 mb-2">Pay as you go</p>
              <div className="flex items-end gap-2 mb-1">
                <span className="text-5xl font-bold text-black">$0</span>
                <span className="text-black/70 mb-2">to start</span>
              </div>
              <p className="text-sm text-black/70">
                First 20K events free. Then $2.00 / 1K events. No minimum.
              </p>
            </div>
            <ul className="space-y-3 flex-1 mb-8 text-sm">
              <li className="flex items-start gap-2 text-black/80">
                <span className="font-bold shrink-0">✓</span>
                Everything in Free
              </li>
              <li className="flex items-start gap-2 text-black/80">
                <span className="font-bold shrink-0">✓</span>
                $2.00 / 1K events after 20K free
              </li>
              <li className="flex items-start gap-2 text-black/80">
                <span className="font-bold shrink-0">✓</span>
                All 8 chains (after $5 cumulative spend)
              </li>
              <li className="flex items-start gap-2 text-black/80">
                <span className="font-bold shrink-0">✓</span>
                Advanced anomaly detection — $0.10/anomaly detected
              </li>
              <li className="flex items-start gap-2 text-black/80">
                <span className="font-bold shrink-0">✓</span>
                CSV audit export + Firestore persistence
              </li>
              <li className="flex items-start gap-2 text-black/80">
                <span className="font-bold shrink-0">✓</span>
                Email support
              </li>
            </ul>
            <Button variant="outline" size="lg" className="w-full bg-white" asChild>
              <a href="https://buy.stripe.com/placeholder" target="_blank" rel="noopener noreferrer">
                Add payment method
                <ArrowRight size={16} className="ml-2" />
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Cost calculator */}
      <section className="border-t-2 border-black bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-black mb-2 text-center">Estimated monthly cost</h2>
            <p className="text-sm text-black/60 text-center mb-10">
              First 20K events always free. $2.00 / 1K events beyond that. No minimum charge.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {costBreakpoints.map((bp) => (
                <div
                  key={bp.label}
                  className="rounded-base border-2 border-black bg-bg p-4 shadow-shadow text-center"
                >
                  <p className="text-xs font-mono font-bold text-black/50 mb-2">{bp.label}</p>
                  <p className="text-2xl font-bold text-black">
                    ${bp.cost.toFixed(2)}
                  </p>
                  <p className="text-xs text-black/40 mt-1">/mo</p>
                </div>
              ))}
            </div>
            <p className="text-center text-xs text-black/40 mt-6 font-mono">
              Formula: max(0, events − 20,000) / 1,000 × $2.00
            </p>
          </div>
        </div>
      </section>

      {/* Feature comparison table */}
      <section className="border-t-2 border-black bg-bg">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-2xl font-bold text-black mb-8 text-center">Full feature comparison</h2>
          <div className="overflow-x-auto rounded-base border-2 border-black shadow-shadow">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-black text-white">
                  <th className="text-left px-4 py-3 font-bold">Feature</th>
                  <th className="text-center px-4 py-3 font-bold w-28">Free</th>
                  <th className="text-center px-4 py-3 font-bold w-36">Pay as you go</th>
                </tr>
              </thead>
              <tbody>
                {categories.flatMap((cat) => {
                  const rows = featureRows.filter((r) => r.category === cat);
                  return [
                    <tr key={`cat-${cat}`} className="border-t-2 border-black">
                      <td
                        colSpan={3}
                        className="px-4 py-2 font-bold text-xs uppercase tracking-wide text-black/40 bg-black/5"
                      >
                        {cat}
                      </td>
                    </tr>,
                    ...rows.map((row, i) => (
                      <tr
                        key={`${cat}-${row.feature}`}
                        className={i % 2 === 0 ? "bg-white" : "bg-bg"}
                      >
                        <td className="px-4 py-3 text-black/80">{row.feature}</td>
                        <td className="px-4 py-3 text-center">{renderCell(row.free)}</td>
                        <td className="px-4 py-3 text-center">{renderCell(row.payg)}</td>
                      </tr>
                    )),
                  ];
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t-2 border-black bg-black text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 text-center">
          <h2 className="text-3xl font-bold mb-4">Start free. Pay only when you scale.</h2>
          <p className="text-white/60 mb-8 max-w-lg mx-auto">
            20,000 events/mo free forever. No monthly minimum. No credit card to get started.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/docs">
                Get started free
                <ArrowRight size={16} className="ml-2" />
              </Link>
            </Button>
            <Button variant="secondary" size="lg" asChild>
              <Link href="/faqs">Read FAQs</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
