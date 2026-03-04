"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

const navLinks = [
  { href: "/docs", label: "Docs" },
  { href: "/use-cases", label: "Use Cases" },
  { href: "/integrations", label: "Integrations" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faqs", label: "FAQs" },
  { href: "/blog", label: "Blog" },
];

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--term-surface-2)] bg-[#09090b]/95 backdrop-blur-sm">
      <nav
        className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
        aria-label="Main navigation"
      >
        {/* Logo + Ecosystem strip */}
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-base font-bold tracking-tight text-foreground"
          >
            <span className="text-[var(--term-green)]">$</span>
            <span>kontext</span>
          </Link>

          {/* Ecosystem strip — desktop */}
          <div className="hidden lg:flex items-center gap-3 text-[10px] font-light uppercase tracking-widest text-[var(--term-text-3)]">
            <span className="flex items-center gap-1">
              <span className="led-green" />
              Circle
            </span>
            <span className="text-[var(--term-surface-3)]">·</span>
            <span className="flex items-center gap-1">
              <span className="led-green" />
              Arc
            </span>
            <span className="text-[var(--term-surface-3)]">·</span>
            <span className="flex items-center gap-1">
              <span className="led-green" />
              USDC
            </span>
          </div>
        </div>

        {/* Desktop nav links */}
        <div className="hidden md:flex md:items-center md:gap-0.5">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 py-2 text-xs text-[var(--term-text-2)] transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:flex md:items-center md:gap-3">
          <Button variant="ghost" size="sm" asChild>
            <a
              href="https://github.com/Legaci-Labs/kontext"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </a>
          </Button>
          <Button size="sm" asChild>
            <Link href="/docs">Get Started</Link>
          </Button>
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2 text-[var(--term-text-2)] hover:text-foreground"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[var(--term-surface-2)] bg-[#09090b]">
          <div className="px-4 py-4">
            {/* Mobile ecosystem strip */}
            <div className="flex items-center gap-3 text-[10px] font-light uppercase tracking-widest text-[var(--term-text-3)] pb-4 border-b border-[var(--term-surface-2)] mb-2">
              <span className="flex items-center gap-1">
                <span className="led-green" />
                Circle
              </span>
              <span className="text-[var(--term-surface-3)]">·</span>
              <span className="flex items-center gap-1">
                <span className="led-green" />
                Arc
              </span>
              <span className="text-[var(--term-surface-3)]">·</span>
              <span className="flex items-center gap-1">
                <span className="led-green" />
                USDC
              </span>
            </div>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block px-3 py-3 text-sm text-[var(--term-text-2)] hover:text-foreground hover:bg-[var(--term-surface)]"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-4 flex flex-col gap-2">
              <Button variant="outline" size="sm" asChild>
                <a
                  href="https://github.com/Legaci-Labs/kontext"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on GitHub
                </a>
              </Button>
              <Button size="sm" asChild>
                <Link href="/docs" onClick={() => setMobileMenuOpen(false)}>
                  Get Started
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
