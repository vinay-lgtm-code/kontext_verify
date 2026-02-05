import Link from "next/link";

const footerLinks = {
  Product: [
    { href: "/docs", label: "Documentation" },
    { href: "/pricing", label: "Pricing" },
    { href: "/docs#quickstart", label: "Quick Start" },
    { href: "/docs#api", label: "API Reference" },
  ],
  Integrations: [
    { href: "/docs#usdc", label: "USDC on Base" },
    { href: "/docs#x402", label: "x402 Protocol" },
    { href: "/docs#ucp", label: "Google UCP/A2A" },
    { href: "/docs#stripe", label: "Stripe Agentic" },
  ],
  Company: [
    { href: "/about", label: "About" },
    { href: "/blog", label: "Blog" },
    {
      href: "https://github.com/kontext-verify",
      label: "GitHub",
      external: true,
    },
    { href: "https://x.com/kontextverify", label: "X (Twitter)", external: true },
  ],
  Legal: [
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/terms", label: "Terms of Service" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 py-12 md:grid-cols-4">
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-foreground">
                {category}
              </h3>
              <ul className="mt-4 space-y-3">
                {links.map((link) => (
                  <li key={link.href}>
                    {"external" in link && link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
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

        <div className="flex flex-col items-center justify-between gap-4 border-t border-border/40 py-8 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 border border-primary/20">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
            <span className="text-sm font-medium">Kontext</span>
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Kontext. Open source under MIT License.
          </p>
        </div>
      </div>
    </footer>
  );
}
