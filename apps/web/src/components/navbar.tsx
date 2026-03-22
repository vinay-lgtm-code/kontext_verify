"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

const navLinks = [
  { href: "/#product", label: "Product" },
  { href: "/use-cases", label: "Use Cases" },
  { href: "/ai-agents", label: "AI Agents" },
  { href: "/bank-readiness", label: "Bank Readiness" },
  { href: "/pricing", label: "Pricing" },
  { href: "/docs", label: "Docs" },
  { href: "/blog", label: "Blog" },
];


export function Navbar() {
  const pathname = usePathname();
  const isLanding = pathname === "/";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-colors duration-200 ${
        scrolled
          ? "border-b border-[var(--ic-border)] bg-[#07080b]/90 backdrop-blur-2xl"
          : "bg-transparent"
      }`}
    >
      <nav
        className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
        aria-label="Main navigation"
      >
        {/* Logo */}
        <Link
          href="/"
          className={`${isLanding ? "text-[2.5rem] leading-none" : "text-xl"} font-serif italic text-[var(--ic-accent)] tracking-tight transition-all`}
        >
          Kontext
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex md:items-center md:gap-1">
          {navLinks.map((link) =>
            link.href.startsWith("/#") ? (
              <a
                key={link.href}
                href={link.href}
                className="px-3 py-2 text-sm text-[var(--ic-text-muted)] transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-2 text-sm text-[var(--ic-text-muted)] transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            )
          )}
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:flex md:items-center md:gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link href="/docs">View Docs</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/contact">Book a Demo</Link>
          </Button>
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2 text-[var(--ic-text-muted)] hover:text-foreground"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[var(--ic-border)] bg-[#07080b]">
          <div className="px-4 py-4 space-y-1">
            {navLinks.map((link) =>
              link.href.startsWith("/#") ? (
                <a
                  key={link.href}
                  href={link.href}
                  className="block px-3 py-3 text-sm text-[var(--ic-text-muted)] hover:text-foreground hover:bg-[var(--ic-surface)] rounded-lg"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block px-3 py-3 text-sm text-[var(--ic-text-muted)] hover:text-foreground hover:bg-[var(--ic-surface)] rounded-lg"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              )
            )}

            <div className="pt-4 flex flex-col gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/docs" onClick={() => setMobileMenuOpen(false)}>
                  View Docs
                </Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/contact" onClick={() => setMobileMenuOpen(false)}>
                  Book a Demo
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
