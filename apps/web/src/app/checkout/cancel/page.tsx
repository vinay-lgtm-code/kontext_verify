import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Checkout Cancelled",
  description: "Your Kontext Pro checkout was cancelled. No charge was made.",
};

export default function CheckoutCancelPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <h1 className="text-3xl font-bold tracking-tight">No worries!</h1>
      <p className="mt-3 text-lg text-muted-foreground">
        Your checkout was cancelled and you were not charged. The Free tier is
        always available with 20K events/month.
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        If you have questions about pricing or need a custom plan, feel free to{" "}
        <a
          href="https://cal.com/vinnaray"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          book a call
        </a>
        .
      </p>

      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
        <Button asChild>
          <Link href="/pricing">
            Back to Pricing
            <ArrowRight size={16} className="ml-2" />
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <a
            href="https://github.com/vinay-lgtm-code/kontext_verify"
            target="_blank"
            rel="noopener noreferrer"
          >
            Get Started Free
          </a>
        </Button>
      </div>
    </div>
  );
}
