"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Check, ArrowRight, Loader2 } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

interface SessionInfo {
  status: string | null;
  customer: string | null;
  subscription: string | null;
  customerEmail: string | null;
}

export default function CheckoutSuccessPage() {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");

    if (!sessionId) {
      setError("No session ID found. Please contact support if you were charged.");
      setLoading(false);
      return;
    }

    fetch(`${API_URL}/v1/checkout/success?session_id=${sessionId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to verify session");
        return res.json();
      })
      .then((data: SessionInfo) => {
        setSession(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to verify session");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 size={20} className="animate-spin" />
          Verifying your subscription...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="mt-2 text-muted-foreground">{error}</p>
        <Button className="mt-6" asChild>
          <Link href="/pricing">Back to Pricing</Link>
        </Button>
      </div>
    );
  }

  const nextSteps = [
    {
      title: "Get your API key",
      description: "Head to the dashboard to generate your Pro API key.",
      href: "/docs",
    },
    {
      title: "Install the SDK",
      description: "npm install kontext-sdk -- works with any Node.js or edge runtime.",
      href: "https://github.com/vinay-lgtm-code/kontext_verify",
    },
    {
      title: "Read the docs",
      description: "Set up compliance logging, trust scoring, and anomaly detection in minutes.",
      href: "/docs",
    },
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:py-24">
      {/* Confirmation header */}
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Check size={32} className="text-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome to Kontext Pro!
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Your subscription is confirmed. You now have access to 100K events/mo,
          cloud dashboard, all protocols, and advanced compliance features.
        </p>
        {session?.customerEmail && (
          <p className="mt-1 text-sm text-muted-foreground">
            Confirmation sent to{" "}
            <span className="font-medium text-foreground">
              {session.customerEmail}
            </span>
          </p>
        )}
      </div>

      {/* Next steps */}
      <div className="mt-12 space-y-4">
        <h2 className="text-lg font-semibold">Next steps</h2>
        {nextSteps.map((step, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {i + 1}
                </span>
                {step.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>{step.description}</CardDescription>
              <Button variant="link" className="mt-1 h-auto p-0 text-sm" asChild>
                {step.href.startsWith("http") ? (
                  <a href={step.href} target="_blank" rel="noopener noreferrer">
                    Go <ArrowRight size={14} className="ml-1" />
                  </a>
                ) : (
                  <Link href={step.href}>
                    Go <ArrowRight size={14} className="ml-1" />
                  </Link>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Manage subscription */}
      <div className="mt-10 text-center">
        <p className="text-sm text-muted-foreground">
          Need to update payment method, change seats, or cancel?
        </p>
        {session?.customer && (
          <Button variant="outline" className="mt-3" asChild>
            <a
              href="#"
              onClick={async (e) => {
                e.preventDefault();
                try {
                  const res = await fetch(`${API_URL}/v1/portal`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ customerId: session.customer }),
                  });
                  const { url } = await res.json();
                  if (url) window.location.href = url;
                } catch {
                  // Portal unavailable — fall back
                }
              }}
            >
              Manage Subscription
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
