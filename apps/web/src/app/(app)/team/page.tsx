import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Team — Kontext",
  description:
    "Meet the team behind Kontext, the compliance logging SDK for autonomous wallet developers.",
};

export default function TeamPage() {
  return (
    <>
      <section className="border-b border-[var(--term-surface-2)]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="max-w-3xl">
            <h1 className="text-sm font-medium">
              <span className="text-[var(--term-green)]">$</span> TEAM
            </h1>
            <p className="mt-6 text-sm text-[var(--term-text-2)] leading-relaxed">
              Kontext is built by Legaci Labs Inc., a company focused on
              compliance infrastructure for the agent economy.
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-[var(--term-surface-2)]">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row gap-8 items-start">
            <Image
              src="/vinay-narayan.jpg"
              alt="Vinay Narayan"
              width={120}
              height={120}
              className="rounded-full border-2 border-[var(--term-surface-2)] flex-shrink-0"
            />
            <div>
              <h2 className="text-base font-medium">Vinay Narayan</h2>
              <p className="mt-1 text-xs text-[var(--term-text-3)] font-mono">
                Founder & CEO, Legaci Labs Inc.
              </p>
              <p className="mt-4 text-sm text-[var(--term-text-2)] leading-relaxed">
                Vinay Narayan is a seasoned technical and business leader with
                deep expertise in payment systems, compliance and risk
                engineering. He was the founder of Cypher, a cybersecurity
                platform for small businesses. Previously he was the Head of
                Strategy & Operations at Meta Reality Labs, a Product Manager on
                the Payments and Assistant teams at Google and a payments analyst
                at eBay/PayPal. He holds multiple granted US patents in integrity
                verification, cryptography and AI. He holds an MBA and MA in
                International Studies from the University of Pennsylvania.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8 text-center">
          <p className="text-xs text-[var(--term-text-3)] mb-4">
            Interested in what we&apos;re building?
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button asChild>
              <Link href="/docs">
                Read the Docs
                <ArrowRight size={16} className="ml-2" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/contact">Get in Touch</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
