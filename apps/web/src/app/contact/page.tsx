"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
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
      <section className="border-b border-[var(--term-surface-2)]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <Link
              href="/"
              className="mb-8 inline-flex items-center gap-1 text-xs text-[var(--term-text-3)] hover:text-[var(--term-text-2)] transition-colors"
            >
              <ArrowLeft size={14} />
              Back to home
            </Link>
            <h1 className="text-sm font-medium">
              <span className="text-[var(--term-green)]">$</span>{" "}
              CONTACT
            </h1>
            <p className="mt-4 text-xs text-[var(--term-text-2)]">
              Interested in Pro? Have a question about payment infrastructure?
              Drop us a line and we will get back to you within one business day.
            </p>
          </div>
        </div>
      </section>

      {/* Form */}
      <section className="bg-background">
        <div className="mx-auto max-w-xl px-4 py-16 sm:px-6 lg:px-8">
          {status === "success" ? (
            <div className=" border border-emerald-500/30 bg-emerald-500/5 p-8 text-center">
              <CheckCircle
                size={48}
                className="mx-auto mb-4 text-emerald-500"
              />
              <h2 className="text-2xl font-bold">Message sent</h2>
              <p className="mt-2 text-muted-foreground">
                We will get back to you within one business day.
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
                  className="block text-xs font-medium mb-2 uppercase tracking-widest text-[var(--term-text-3)]"
                >
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  className="w-full  border border-border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-medium mb-2 uppercase tracking-widest text-[var(--term-text-3)]"
                >
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  className="w-full  border border-border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="you@company.com"
                />
              </div>

              <div>
                <label
                  htmlFor="company"
                  className="block text-xs font-medium mb-2 uppercase tracking-widest text-[var(--term-text-3)]"
                >
                  Company
                </label>
                <input
                  type="text"
                  id="company"
                  name="company"
                  className="w-full  border border-border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Your company (optional)"
                />
              </div>

              <div>
                <label
                  htmlFor="interest"
                  className="block text-xs font-medium mb-2 uppercase tracking-widest text-[var(--term-text-3)]"
                >
                  I am interested in
                </label>
                <select
                  id="interest"
                  name="interest"
                  required
                  className="w-full  border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Select a plan</option>
                  <option value="pro">Pro (usage-based)</option>
                  <option value="other">Other / General inquiry</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="message"
                  className="block text-xs font-medium mb-2 uppercase tracking-widest text-[var(--term-text-3)]"
                >
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={5}
                  required
                  className="w-full  border border-border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  placeholder="Tell us about your use case, expected volume, or any questions you have."
                />
              </div>

              {status === "error" && (
                <div className="flex items-start gap-3  border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-400">
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

              <p className="text-center text-xs text-muted-foreground">
                We typically respond within one business day.
              </p>
            </form>
          )}
        </div>
      </section>
    </>
  );
}
