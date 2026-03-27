"use client";

import Link from "next/link";
import { CookieSettingsButton } from "./cookie-consent";

const footerLinks = {
  Product: [
    { href: "/docs", label: "Documentation" },
    { href: "/use-cases", label: "Use Cases" },
    { href: "/bank-readiness", label: "Bank Readiness" },
    { href: "/ai-agents", label: "AI Agents" },
    { href: "/integrations", label: "Integrations" },
    { href: "/changelog", label: "Changelog" },
  ],
  Resources: [
    { href: "/faqs", label: "FAQs" },
    { href: "/blog", label: "Blog" },
    { href: "/assessment", label: "Readiness Assessment" },
    { href: "/bank-readiness-checklist", label: "Bank Readiness Checklist" },
    { href: "/sample-payment-decision-packet", label: "Sample Evidence Packet" },
    { href: "/sample-ai-initiated-payment-packet", label: "AI Payment Packet" },
    { href: "/evidence-calculator", label: "Evidence Calculator" },
    { href: "/contact", label: "Contact" },
  ],
  Company: [
    { href: "/about", label: "About" },
    { href: "/team", label: "Founder" },
    { href: "/privacy", label: "Privacy" },
    { href: "/terms", label: "Terms" },
    { href: "#cookie-settings", label: "Cookie Settings", cookieSettings: true },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-[var(--ic-border)] bg-[var(--ic-surface)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 py-12 md:grid-cols-4">
          {/* Logo column */}
          <div>
            <Link href="/" className="text-lg font-serif italic text-[var(--ic-accent)]">
              Kontext
            </Link>
            <p className="mt-3 text-xs text-[var(--ic-text-dim)] leading-relaxed max-w-[200px]">
              Evidence an examiner can trust. From every payment decision.
            </p>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-[10px] font-mono font-medium uppercase tracking-widest text-[var(--ic-text-dim)]">
                {category}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {links.map((link) => (
                  <li key={link.href}>
                    {"cookieSettings" in link && link.cookieSettings ? (
                      <CookieSettingsButton />
                    ) : "external" in link && link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[var(--ic-text-muted)] transition-colors hover:text-[var(--ic-accent)]"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-xs text-[var(--ic-text-muted)] transition-colors hover:text-[var(--ic-accent)]"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-[var(--ic-border)] py-6">
          <p className="text-center text-xs text-[var(--ic-text-muted)] leading-relaxed">
            Built with compliance teams at payment companies processing
            stablecoins, cross-border payouts, and embedded finance flows.
          </p>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-[var(--ic-border)] py-6 md:flex-row">
          <p className="text-xs text-[var(--ic-text-dim)]">
            &copy; {new Date().getFullYear()} Legaci Labs Inc. All rights reserved.
          </p>
        </div>

        <div className="border-t border-[var(--ic-border)] py-4">
          <p className="text-center text-[10px] text-[var(--ic-text-dim)] leading-relaxed max-w-3xl mx-auto">
            Kontext provides compliance infrastructure that generates audit-defensible evidence trails for programmable payments. It
            does not constitute legal advice or guarantee regulatory compliance.
            Consult qualified legal counsel for compliance certification.
          </p>
        </div>
      </div>
    </footer>
  );
}
