"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { useState, type FormEvent } from "react";

const WEB3FORMS_KEY = process.env.NEXT_PUBLIC_WEB3FORMS_KEY ?? "";

type FormStatus = "idle" | "submitting" | "success" | "error";

export default function ContactPage() {
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");

    const form = e.currentTarget;
    const data = new FormData(form);
    data.append("access_key", WEB3FORMS_KEY);

    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: data,
      });
      const json = await res.json();

      if (json.success) {
        setStatus("success");
        form.reset();
      } else {
        setStatus("error");
        setErrorMsg(json.message ?? "Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setErrorMsg("Network error. Please try again.");
    }
  }

  return (
    <>
      {/* Hero */}
      <section className="border-b border-[var(--ic-border)]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <Link
              href="/"
              className="mb-8 inline-flex items-center gap-1 text-xs text-[var(--ic-text-dim)] hover:text-[var(--ic-text-muted)] transition-colors"
            >
              <ArrowLeft size={14} />
              Back to home
            </Link>
            <h1 className="font-serif text-3xl italic text-[var(--ic-text)]">
              Request a demo
            </h1>
            <p className="mt-4 text-sm text-[var(--ic-text-muted)]">
              Tell us about your payment infrastructure and compliance needs.
              We&apos;ll follow up within one business day.
            </p>
          </div>
        </div>
      </section>

      {/* Form */}
      <section className="bg-background">
        <div className="mx-auto max-w-xl px-4 py-16 sm:px-6 lg:px-8">
          {status === "success" ? (
            <div className="rounded-lg border border-[var(--ic-green)]/30 bg-[var(--ic-green-dim)] p-8 text-center">
              <CheckCircle
                size={48}
                className="mx-auto mb-4 text-[var(--ic-green)]"
              />
              <h2 className="text-2xl font-semibold text-[var(--ic-text)]">Message sent</h2>
              <p className="mt-2 text-sm text-[var(--ic-text-muted)]">
                We&apos;ll get back to you within one business day.
              </p>
              <p className="mt-4 text-sm text-[var(--ic-text-muted)]">
                Want to get started sooner?{" "}
                <a
                  href="https://cal.com/vinay-narayan2/30min"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--ic-accent)] hover:underline"
                >
                  Schedule a call now →
                </a>
              </p>
              <Button className="mt-6" asChild>
                <Link href="/">Back to home</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Honeypot */}
              <input
                type="checkbox"
                name="botcheck"
                className="hidden"
                tabIndex={-1}
                autoComplete="off"
              />

              <div>
                <label
                  htmlFor="name"
                  className="block font-mono text-[10px] font-medium mb-2 uppercase tracking-widest text-[var(--ic-text-dim)]"
                >
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  className="w-full rounded-lg border border-[var(--ic-border)] bg-[var(--ic-surface)] px-4 py-3 text-sm text-[var(--ic-text)] placeholder:text-[var(--ic-text-dim)] focus:border-[var(--ic-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--ic-accent)]"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block font-mono text-[10px] font-medium mb-2 uppercase tracking-widest text-[var(--ic-text-dim)]"
                >
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  className="w-full rounded-lg border border-[var(--ic-border)] bg-[var(--ic-surface)] px-4 py-3 text-sm text-[var(--ic-text)] placeholder:text-[var(--ic-text-dim)] focus:border-[var(--ic-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--ic-accent)]"
                  placeholder="you@company.com"
                />
              </div>

              <div>
                <label
                  htmlFor="company"
                  className="block font-mono text-[10px] font-medium mb-2 uppercase tracking-widest text-[var(--ic-text-dim)]"
                >
                  Company
                </label>
                <input
                  type="text"
                  id="company"
                  name="company"
                  className="w-full rounded-lg border border-[var(--ic-border)] bg-[var(--ic-surface)] px-4 py-3 text-sm text-[var(--ic-text)] placeholder:text-[var(--ic-text-dim)] focus:border-[var(--ic-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--ic-accent)]"
                  placeholder="Your company (optional)"
                />
              </div>

              <div>
                <label
                  htmlFor="role"
                  className="block font-mono text-[10px] font-medium mb-2 uppercase tracking-widest text-[var(--ic-text-dim)]"
                >
                  Role
                </label>
                <input
                  type="text"
                  id="role"
                  name="role"
                  className="w-full rounded-lg border border-[var(--ic-border)] bg-[var(--ic-surface)] px-4 py-3 text-sm text-[var(--ic-text)] placeholder:text-[var(--ic-text-dim)] focus:border-[var(--ic-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--ic-accent)]"
                  placeholder="e.g., Head of Compliance, CEO, Platform Engineering Lead"
                />
              </div>

              <div>
                <label
                  htmlFor="interest"
                  className="block font-mono text-[10px] font-medium mb-2 uppercase tracking-widest text-[var(--ic-text-dim)]"
                >
                  I am interested in
                </label>
                <select
                  id="interest"
                  name="interest"
                  required
                  className="w-full rounded-lg border border-[var(--ic-border)] bg-[var(--ic-surface)] px-4 py-3 text-sm text-[var(--ic-text)] focus:border-[var(--ic-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--ic-accent)]"
                >
                  <option value="">Select an option</option>
                  <option value="starter">Starter — standing up payments controls</option>
                  <option value="growth">Growth — production compliance for my team</option>
                  <option value="enterprise">Enterprise — regulated platform, custom requirements</option>
                  <option value="general">General inquiry</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="message"
                  className="block font-mono text-[10px] font-medium mb-2 uppercase tracking-widest text-[var(--ic-text-dim)]"
                >
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={5}
                  required
                  className="w-full rounded-lg border border-[var(--ic-border)] bg-[var(--ic-surface)] px-4 py-3 text-sm text-[var(--ic-text)] placeholder:text-[var(--ic-text-dim)] focus:border-[var(--ic-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--ic-accent)] resize-none"
                  placeholder="Tell us about your payment stack, compliance challenges, and what you're looking to solve."
                />
              </div>

              {status === "error" && (
                <div className="flex items-start gap-3 rounded-lg border border-[var(--ic-red)]/30 bg-[var(--ic-red-dim)] p-4 text-sm text-[var(--ic-red)]">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  {errorMsg}
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={status === "submitting"}
              >
                {status === "submitting" ? "Sending..." : "Send Message"}
              </Button>

              <p className="mt-4 text-center text-xs text-[var(--ic-text-dim)]">
                Prefer to schedule directly?{" "}
                <a
                  href="https://cal.com/vinay-narayan2/30min"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--ic-accent)] hover:underline"
                >
                  Book a 30-minute call →
                </a>
              </p>
            </form>
          )}
        </div>
      </section>
    </>
  );
}
