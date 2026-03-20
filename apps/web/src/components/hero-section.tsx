"use client";

import Link from "next/link";
import { FlipText } from "@/components/flip-text";
import { LogoStrip } from "@/components/logo-strip";

export function HeroSection() {
  return (
    <section className="relative px-4 pt-24 pb-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl text-center">
        {/* Context badge */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[var(--ic-accent)]/25 bg-[var(--ic-accent-dim)] px-4 py-1.5 opacity-0 animate-fade-in">
          <span className="h-2 w-2 rounded-full bg-[var(--ic-accent)]" />
          <span className="font-mono text-[11px] font-medium tracking-wide text-[var(--ic-accent)]">
            Rising compliance expectations for programmable payments
          </span>
        </div>

        {/* Headline */}
        <h1 className="font-serif text-4xl font-normal leading-[1.1] tracking-tight text-[var(--ic-text)] sm:text-5xl lg:text-6xl opacity-0 animate-fade-up" style={{ animationDelay: "100ms" }}>
          Compliance-grade audit trails for{" "}
          <em><FlipText words={["payments", "wallets", "agents", "transfers"]} /></em>
        </h1>

        {/* Subheadline */}
        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-[var(--ic-text-muted)] opacity-0 animate-fade-up" style={{ animationDelay: "200ms" }}>
          Capture intent, policy checks, approvals, and execution evidence for
          every autonomous or API-driven payment — so compliance, risk, and
          audit can prove what happened, and why.
        </p>

        {/* CTAs */}
        <div className="mt-8 flex items-center justify-center gap-4 opacity-0 animate-fade-up" style={{ animationDelay: "300ms" }}>
          <Link
            href="/contact"
            className="inline-flex items-center rounded-lg bg-[var(--ic-accent)] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--ic-accent)]/90"
          >
            Book a demo
          </Link>
          <Link
            href="/docs"
            className="inline-flex items-center rounded-lg border border-[var(--ic-border)] px-6 py-3 text-sm font-medium text-[var(--ic-text-muted)] transition-colors hover:bg-[var(--ic-surface)] hover:text-[var(--ic-text)]"
          >
            Read the docs
          </Link>
        </div>

        {/* Patent pill */}
        <p className="mt-4 font-mono text-[11px] text-[var(--ic-text-dim)] opacity-0 animate-fade-up" style={{ animationDelay: "400ms" }}>
          Patented tamper-evident audit trail · US 12,463,819 B1
        </p>

        {/* Dashboard preview */}
        <div className="mx-auto mt-12 max-w-4xl rounded-xl border border-[var(--ic-border)] bg-[var(--ic-surface)] overflow-hidden pointer-events-none select-none shadow-[0_0_60px_-15px_rgba(59,110,248,0.15)] opacity-0 animate-slide-up" style={{ animationDelay: "450ms" }}>
          {/* Browser chrome */}
          <div className="flex items-center gap-2 border-b border-[var(--ic-border)] px-4 py-2.5">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
            </div>
            <div className="ml-3 flex-1 rounded-md bg-[hsl(var(--background))] px-3 py-1">
              <span className="font-mono text-[10px] text-[var(--ic-text-dim)]">app.getkontext.com</span>
            </div>
          </div>

          <div className="flex">
            {/* Mini sidebar */}
            <div className="hidden sm:flex w-40 flex-shrink-0 flex-col border-r border-[var(--ic-border)] bg-[hsl(var(--background))] p-3">
              <span className="mb-4 font-serif text-sm italic text-[var(--ic-accent)]">Kontext</span>
              {["Overview", "Activity", "Evidence", "Reports"].map((item) => (
                <span
                  key={item}
                  className={`rounded-md px-2.5 py-1.5 text-[11px] font-medium ${
                    item === "Activity"
                      ? "bg-[var(--ic-accent-dim)] text-[var(--ic-accent)]"
                      : "text-[var(--ic-text-dim)]"
                  }`}
                >
                  {item}
                </span>
              ))}
            </div>

            {/* Main content */}
            <div className="flex-1 p-4">
              {/* KPI strip */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="rounded-lg border border-[var(--ic-border)] bg-[hsl(var(--background))] p-3">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--ic-text-dim)]">Verified Today</span>
                  <p className="mt-1 text-xl font-semibold text-[var(--ic-green)]">1,247</p>
                </div>
                <div className="rounded-lg border border-[var(--ic-border)] bg-[hsl(var(--background))] p-3">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--ic-text-dim)]">Sanctions Alerts</span>
                  <p className="mt-1 text-xl font-semibold text-[var(--ic-green)]">0</p>
                </div>
                <div className="rounded-lg border border-[var(--ic-border)] bg-[hsl(var(--background))] p-3">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--ic-text-dim)]">Chain Integrity</span>
                  <p className="mt-1 text-xl font-semibold text-[var(--ic-green)]">Intact</p>
                </div>
              </div>

              {/* Activity table */}
              <div className="rounded-lg border border-[var(--ic-border)] bg-[hsl(var(--background))] overflow-hidden">
                {/* Table header */}
                <div className="grid grid-cols-4 gap-4 border-b border-[var(--ic-border)] px-4 py-2">
                  {["Time", "Agent", "Amount", "Status"].map((h) => (
                    <span key={h} className="font-mono text-[9px] font-semibold uppercase tracking-widest text-[var(--ic-text-dim)]">{h}</span>
                  ))}
                </div>

                {/* Rows */}
                {[
                  { time: "14:32:07", agent: "treasury-v2", amount: "$28,000 USDC", status: "verified", color: "green" },
                  { time: "14:31:44", agent: "payroll-agent", amount: "$4,200 USDC", status: "verified", color: "green" },
                  { time: "14:30:19", agent: "treasury-v2", amount: "$125,000 USDC", status: "review", color: "amber" },
                  { time: "14:29:55", agent: "settlement-bot", amount: "$67,500 USDC", status: "verified", color: "green" },
                ].map((row) => (
                  <div key={row.time} className="grid grid-cols-4 gap-4 border-b border-[var(--ic-border)]/50 px-4 py-2.5 last:border-0">
                    <span className="font-mono text-[11px] text-[var(--ic-text-muted)]">{row.time}</span>
                    <span className="font-mono text-[11px] text-[var(--ic-text)]">{row.agent}</span>
                    <span className="text-[11px] font-medium text-[var(--ic-text)]">{row.amount}</span>
                    <span className={`inline-flex w-fit items-center gap-1 rounded px-1.5 py-0.5 ${
                      row.color === "green" ? "bg-[var(--ic-green-dim)]" : "bg-[var(--ic-amber)]/10"
                    }`}>
                      <span className={`h-1 w-1 rounded-full ${
                        row.color === "green" ? "bg-[var(--ic-green)]" : "bg-[var(--ic-amber)]"
                      }`} />
                      <span className={`font-mono text-[8px] font-semibold uppercase tracking-wider ${
                        row.color === "green" ? "text-[var(--ic-green)]" : "text-[var(--ic-amber)]"
                      }`}>{row.status}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Logo strip */}
        <div className="mt-12 opacity-0 animate-fade-in" style={{ animationDelay: "600ms" }}>
          <LogoStrip />
        </div>
      </div>
    </section>
  );
}
