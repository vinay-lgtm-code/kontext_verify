import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy policy for Kontext SDK and getkontext.com.",
};

export default function PrivacyPage() {
  return (
    <section className="bg-background">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <Badge variant="secondary" className="mb-4">
          Legal
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Privacy Policy
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Last updated: February 28, 2026
        </p>

        <div className="prose-kontext mt-12">
          <h2>Overview</h2>
          <p>
            Legaci Labs Inc. (&quot;Kontext&quot;, &quot;we&quot;, &quot;us&quot;)
            operates the Kontext SDK and the getkontext.com website. This policy
            describes what data we collect, how we use it, and your rights.
          </p>

          <h2>SDK (Local Mode)</h2>
          <p>
            The Kontext SDK in local mode (no API key) processes all data on your
            machine. No data is sent to our servers. Audit trails, digest chains,
            and trust scores are computed locally and stored wherever you configure
            (in-memory by default, or file system with FileStorage).
          </p>

          <h2>SDK (Cloud Mode)</h2>
          <p>
            When you provide an API key and use KontextCloudExporter, event data
            is sent to api.getkontext.com for persistence and analytics. This
            includes action logs, transaction metadata, trust scores, and anomaly
            events. We do not store private keys, wallet seeds, or raw transaction
            payloads beyond what you explicitly log.
          </p>

          <h2>Website</h2>
          <p>
            getkontext.com collects standard web analytics (page views, referrers)
            via Vercel Analytics. We use Stripe for payment processing -- Stripe
            collects payment information directly and is subject to their own
            privacy policy. We do not store credit card numbers.
          </p>

          <h2>Data We Collect</h2>
          <ul>
            <li>
              <strong>Account data:</strong> email address, project ID, plan tier
              (when you create an API key)
            </li>
            <li>
              <strong>Usage data:</strong> event counts, API call volume, error
              rates (for metering and billing)
            </li>
            <li>
              <strong>Event data (cloud mode only):</strong> action logs,
              transaction metadata, trust scores, anomaly events as sent by your
              SDK configuration
            </li>
            <li>
              <strong>Web analytics:</strong> page views, referrers, browser type
              (anonymized, no cookies)
            </li>
          </ul>

          <h2>How We Use Data</h2>
          <ul>
            <li>Provide and improve the Kontext SDK and cloud services</li>
            <li>Bill usage-based pricing accurately</li>
            <li>Detect and prevent abuse of our API</li>
            <li>Respond to support requests</li>
          </ul>

          <h2>Data Retention</h2>
          <p>
            Cloud event data is retained for the duration of your subscription
            plus 90 days. You can request deletion at any time by emailing
            privacy@kontext.dev.
          </p>

          <h2>Third Parties</h2>
          <p>
            We use Stripe for billing, Vercel for hosting, and Google Cloud
            Platform for API infrastructure. Each processes data under their
            respective privacy policies. We do not sell your data to third
            parties.
          </p>

          <h2>Your Rights</h2>
          <p>
            You can request access to, correction of, or deletion of your data by
            emailing privacy@kontext.dev. We respond within 30 days.
          </p>

          <h2>Contact</h2>
          <p>
            Legaci Labs Inc.
            <br />
            Email: privacy@kontext.dev
          </p>
        </div>
      </div>
    </section>
  );
}
