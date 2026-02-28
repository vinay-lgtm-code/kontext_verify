import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of service for Kontext SDK and getkontext.com.",
};

export default function TermsPage() {
  return (
    <section className="bg-background">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <Badge variant="secondary" className="mb-4">
          Legal
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Terms of Service
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Last updated: February 28, 2026
        </p>

        <div className="prose-kontext mt-12">
          <h2>Acceptance</h2>
          <p>
            By using the Kontext SDK or getkontext.com (the &quot;Service&quot;),
            you agree to these terms. If you do not agree, do not use the
            Service.
          </p>

          <h2>The SDK</h2>
          <p>
            The Kontext SDK is open-source software licensed under the MIT
            License. You may use, modify, and distribute it in accordance with
            that license. The SDK source code is available at{" "}
            <a
              href="https://github.com/Legaci-Labs/kontext"
              target="_blank"
              rel="noopener noreferrer"
            >
              github.com/Legaci-Labs/kontext
            </a>
            .
          </p>

          <h2>Cloud Services</h2>
          <p>
            Cloud features (API key, cloud persistence, event export) are
            provided by Legaci Labs Inc. and subject to these additional terms:
          </p>
          <ul>
            <li>
              <strong>Free tier:</strong> 20,000 events per month, no credit card
              required. We may rate-limit or suspend accounts that abuse the free
              tier.
            </li>
            <li>
              <strong>Pro tier:</strong> $2 per 1,000 events above the 20,000
              free events. Billed monthly via Stripe. No monthly minimum, no
              commitment.
            </li>
          </ul>

          <h2>Not Legal or Compliance Advice</h2>
          <p>
            Kontext is a developer tool. It provides technical infrastructure
            that can support compliance efforts, but it does not constitute legal
            advice, regulatory guidance, or a compliance certification.{" "}
            <strong>
              Using Kontext does not make you compliant with any regulation.
            </strong>{" "}
            Consult qualified legal counsel for compliance certification.
          </p>

          <h2>No Warranty</h2>
          <p>
            The Service is provided &quot;as is&quot; without warranty of any
            kind. We do not guarantee uptime, accuracy of compliance checks, or
            completeness of audit trails. You are responsible for validating that
            the SDK meets your requirements.
          </p>

          <h2>Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, Legaci Labs Inc. shall not be
            liable for any indirect, incidental, special, consequential, or
            punitive damages arising from your use of the Service, including but
            not limited to regulatory fines, failed compliance audits, or
            financial losses from agent transactions.
          </p>

          <h2>Your Responsibilities</h2>
          <ul>
            <li>Keep your API keys confidential</li>
            <li>
              Do not use the Service for illegal activity or to circumvent
              sanctions
            </li>
            <li>
              Ensure your use of the SDK complies with applicable laws in your
              jurisdiction
            </li>
            <li>
              Maintain your own backups of audit data -- we are not a backup
              service
            </li>
          </ul>

          <h2>Termination</h2>
          <p>
            We may suspend or terminate your access to cloud services for
            violation of these terms, abuse, or non-payment. You may cancel your
            subscription at any time. Upon cancellation, cloud data is retained
            for 90 days before deletion.
          </p>

          <h2>Changes</h2>
          <p>
            We may update these terms. Material changes will be communicated via
            email to registered users. Continued use after changes constitutes
            acceptance.
          </p>

          <h2>Governing Law</h2>
          <p>
            These terms are governed by the laws of the State of Delaware,
            United States.
          </p>

          <h2>Contact</h2>
          <p>
            Legaci Labs Inc.
            <br />
            Email: legal@kontext.dev
          </p>
        </div>
      </div>
    </section>
  );
}
