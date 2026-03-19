"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, ChevronDown } from "lucide-react";

const mainLinks = [
  { href: "/docs", label: "Docs" },
];

const resourceLinks = [
  { href: "/playground", label: "Playground" },
  { href: "/use-cases", label: "Use Cases" },
  { href: "/integrations", label: "Integrations" },
  { href: "/faqs", label: "FAQs" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
];

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setResourcesOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
              Base
            </span>
            <span className="text-[var(--term-surface-3)]">·</span>
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
          {mainLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 py-2 text-xs text-[var(--term-text-2)] transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}

          {/* Resources dropdown */}
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setResourcesOpen(!resourcesOpen)}
              className="flex items-center gap-1 px-3 py-2 text-xs text-[var(--term-text-2)] transition-colors hover:text-foreground"
              aria-expanded={resourcesOpen}
              aria-haspopup="true"
            >
              Resources
              <ChevronDown
                size={12}
                className={`transition-transform ${resourcesOpen ? "rotate-180" : ""}`}
              />
            </button>
            {resourcesOpen && (
              <div className="absolute left-0 top-full mt-1 w-44 border border-[var(--term-surface-2)] bg-[var(--term-surface)] py-1 shadow-lg">
                {resourceLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block px-4 py-2 text-xs text-[var(--term-text-2)] transition-colors hover:text-foreground hover:bg-[var(--term-surface-2)]"
                    onClick={() => setResourcesOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:flex md:items-center md:gap-3">
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
                Base
              </span>
              <span className="text-[var(--term-surface-3)]">·</span>
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

            {/* Main links */}
            {mainLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block px-3 py-3 text-sm text-[var(--term-text-2)] hover:text-foreground hover:bg-[var(--term-surface)]"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}

            {/* Resources section */}
            <div className="mt-2 pt-2 border-t border-[var(--term-surface-2)]">
              <p className="px-3 py-2 text-[10px] font-light uppercase tracking-widest text-[var(--term-text-3)]">
                Resources
              </p>
              {resourceLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block px-3 py-3 text-sm text-[var(--term-text-2)] hover:text-foreground hover:bg-[var(--term-surface)]"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="pt-4 flex flex-col gap-2">
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
