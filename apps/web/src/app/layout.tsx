import type { Metadata } from "next";
import { Fira_Code } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const firaCode = Fira_Code({
  subsets: ["latin"],
  variable: "--font-fira-code",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://getkontext.com"),
  title: {
    default: "Kontext — Trust infrastructure for agents that move USDC on Base & Arc",
    template: "%s | Kontext",
  },
  description:
    "Proof of compliance SDK for AI agents making agentic stablecoin and fiat payments. OFAC screening, audit trails, on-chain anchoring, and A2A attestation. Free on Base + Arc. Zero dependencies.",
  keywords: [
    "USDC compliance SDK",
    "AI agent audit trail",
    "on-chain anchoring",
    "digest anchoring",
    "A2A attestation",
    "agent-to-agent attestation",
    "Base chain compliance",
    "Arc chain compliance",
    "Circle Programmable Wallets compliance",
    "stablecoin compliance",
    "trust scoring",
    "GENIUS Act",
    "OFAC screening",
    "TypeScript SDK",
    "x402 protocol",
    "batch anchoring",
  ],
  authors: [{ name: "Kontext" }],
  creator: "Kontext",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://getkontext.com",
    siteName: "Kontext",
    title: "Kontext — Trust infrastructure for agents that move USDC on Base & Arc",
    description:
      "Proof of compliance SDK for AI agents. OFAC screening, audit trails, on-chain anchoring. Free on Base + Arc.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Kontext — Trust infrastructure for agents that move USDC",
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Kontext",
  legalName: "Legaci Labs Inc.",
  url: "https://getkontext.com",
  logo: "https://getkontext.com/og-image.png",
  sameAs: [
    "https://github.com/Legaci-Labs/kontext",
    "https://www.npmjs.com/package/kontext-sdk",
  ],
  contactPoint: {
    "@type": "ContactPoint",
    email: "hello@kontext.dev",
    contactType: "technical support",
  },
};

const softwareJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Kontext SDK",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Cross-platform (Node.js 18+)",
  programmingLanguage: "TypeScript",
  softwareVersion: "0.8.0",
  license: "https://opensource.org/licenses/MIT",
  url: "https://getkontext.com",
  downloadUrl: "https://www.npmjs.com/package/kontext-sdk",
  codeRepository: "https://github.com/Legaci-Labs/kontext",
  description:
    "Trust infrastructure for AI agents that move USDC on Base & Arc. Audit trails, OFAC screening, on-chain anchoring, and agent-to-agent attestation. Zero runtime dependencies.",
  offers: [
    {
      "@type": "Offer",
      name: "Free",
      price: "0",
      priceCurrency: "USD",
      description: "20,000 events/month on Base + Arc. Core SDK, digest chain, trust scoring.",
    },
    {
      "@type": "Offer",
      name: "Pay as you go",
      price: "0.002",
      priceCurrency: "USD",
      unitText: "per event above 20K free",
      description: "ETH, SOL, Base, Polygon, Arbitrum, Optimism, Arc, Avalanche. Anomaly rules, unified screening, CSV export, cloud persistence.",
    },
  ],
  author: {
    "@type": "Organization",
    name: "Legaci Labs Inc.",
  },
  featureList: [
    "Transaction verification with OFAC screening",
    "Tamper-evident SHA-256 digest chain",
    "On-chain anchoring to Base smart contracts",
    "Batch anchoring (50 digests per tx, ~$0.001)",
    "Agent-to-agent (A2A) attestation",
    "x402 micropayment compliance",
    "Trust scoring (0-100) with 5-factor breakdown",
    "Rule-based anomaly detection",
    "Agent reasoning logs",
    "Compliance certificate generation",
    "Human-in-the-loop task confirmation",
    "ERC-8021 transaction attribution",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLdScripts = [
    JSON.stringify(organizationJsonLd),
    JSON.stringify(softwareJsonLd),
  ];

  return (
    <html
      lang="en"
      className={firaCode.variable}
    >
      <head>
        <meta name="base:app_id" content="69a630f4a0fdf68983d307ed" />
        {jsonLdScripts.map((script, i) => (
          <script
            key={i}
            type="application/ld+json"
            suppressHydrationWarning
            dangerouslySetInnerHTML={{ __html: script }}
          />
        ))}
      </head>
      <body className="min-h-screen bg-background font-mono antialiased">
        <Script id="microsoft-clarity" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window, document, "clarity", "script", "qi6iav4al4");`}
        </Script>
        {children}
      </body>
    </html>
  );
}
