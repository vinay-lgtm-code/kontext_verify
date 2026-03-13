import Link from "next/link";

const footerLinks = {
  Product: [
    { href: "/docs", label: "Documentation" },
    { href: "/pricing", label: "Pricing" },
    { href: "/use-cases", label: "Use Cases" },
    { href: "/integrations", label: "Integrations" },
    { href: "/changelog", label: "Changelog" },
  ],
  Resources: [
    { href: "/faqs", label: "FAQs" },
    { href: "/blog", label: "Blog" },
    { href: "/contact", label: "Contact" },
    {
      href: "https://github.com/Legaci-Labs/kontext",
      label: "GitHub",
      external: true,
    },
  ],
  Company: [
    { href: "/about", label: "About" },
    { href: "/privacy", label: "Privacy" },
    { href: "/terms", label: "Terms" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-[var(--term-surface-2)] bg-[var(--term-surface)]">
      {/* Persistent terminal line */}
      <div className="border-b border-[var(--term-surface-2)] py-3 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs text-[var(--term-text-3)] font-light tracking-wide">
            <span className="text-[var(--term-green)]">$</span>{" "}
            kontext v0.8.0{" "}
            <span className="text-[var(--term-surface-3)]">·</span> USDC + x402{" "}
            <span className="text-[var(--term-surface-3)]">·</span> Base + Arc{" "}
            <span className="text-[var(--term-surface-3)]">·</span>{" "}
            <span className="inline-flex items-center gap-1">
              <span className="led-green" />
              Open Source
            </span>{" "}
            <span className="text-[var(--term-surface-3)]">·</span> Zero Dependencies
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 py-10 md:grid-cols-3">
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-[10px] font-light uppercase tracking-widest text-[var(--term-text-3)]">
                {category}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {links.map((link) => (
                  <li key={link.href}>
                    {"external" in link && link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[var(--term-text-2)] transition-colors hover:text-[var(--term-blue)]"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-xs text-[var(--term-text-2)] transition-colors hover:text-[var(--term-blue)]"
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

        <div className="flex flex-col items-center justify-between gap-4 border-t border-[var(--term-surface-2)] py-6 md:flex-row">
          <div className="flex items-center gap-1.5 text-xs text-[var(--term-text-3)]">
            <span className="text-[var(--term-green)]">$</span>
            <span className="font-medium text-[var(--term-text-2)]">kontext</span>
            <span>v0.8.0</span>
            <span className="text-[var(--term-surface-3)]">·</span>
            <span>Legaci Labs Inc.</span>
            <span className="text-[var(--term-surface-3)]">·</span>
            <span>MIT</span>
          </div>
          <p className="text-[10px] text-[var(--term-text-3)]">
            &copy; {new Date().getFullYear()} Legaci Labs Inc. All rights reserved.
          </p>
        </div>

        <div className="border-t border-[var(--term-surface-2)] py-4">
          <p className="text-center text-[10px] text-[var(--term-text-3)] leading-relaxed max-w-3xl mx-auto">
            Kontext provides developer tools that generate proof of compliance for agentic payments. It
            does not constitute legal advice or guarantee regulatory compliance.
            Consult qualified legal counsel for compliance certification.
          </p>
        </div>
      </div>
    </footer>
  );
}
