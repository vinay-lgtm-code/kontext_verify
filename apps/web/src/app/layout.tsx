import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://getkontext.com"),
  title: {
    default: "Kontext — Trust SDK for agents that move money",
    template: "%s | Kontext",
  },
  description:
    "Audit trails, OFAC screening, on-chain anchoring, and agent-to-agent attestation for every wallet transfer. Free forever. Zero dependencies.",
  keywords: [
    "USDC compliance SDK",
    "AI agent audit trail",
    "on-chain anchoring",
    "digest anchoring",
    "A2A attestation",
    "agent-to-agent attestation",
    "Base chain compliance",
    "Circle Programmable Wallets compliance",
    "stablecoin compliance",
    "trust scoring",
    "GENIUS Act",
    "OFAC screening",
    "TypeScript SDK",
    "x402 protocol",
    "Base Sepolia",
  ],
  authors: [{ name: "Kontext" }],
  creator: "Kontext",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://getkontext.com",
    siteName: "Kontext",
    title: "Kontext — Trust SDK for agents that move money",
    description:
      "Audit trails, OFAC screening, on-chain anchoring, and agent-to-agent attestation for every wallet transfer. Free forever.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Kontext — Trust SDK for agents that move money",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kontext — Trust SDK for agents that move money",
    description:
      "Audit trails, OFAC screening, on-chain anchoring, and agent-to-agent attestation for every wallet transfer.",
    images: ["/og-image.png"],
    creator: "@kontextverify",
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
    "https://x.com/kontextverify",
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
  softwareVersion: "0.7.0",
  license: "https://opensource.org/licenses/MIT",
  url: "https://getkontext.com",
  downloadUrl: "https://www.npmjs.com/package/kontext-sdk",
  codeRepository: "https://github.com/Legaci-Labs/kontext",
  description:
    "Trust infrastructure for AI agents that move money. Audit trails, OFAC screening, on-chain anchoring, and agent-to-agent attestation for every wallet transfer. Zero runtime dependencies.",
  offers: [
    {
      "@type": "Offer",
      name: "Free",
      price: "0",
      priceCurrency: "USD",
      description: "20,000 events/month. Core SDK, digest chain, trust scoring, Base chain.",
    },
    {
      "@type": "Offer",
      name: "Pro",
      price: "2.00",
      priceCurrency: "USD",
      unitText: "per 1,000 events above 20K free",
      description: "Usage-based. All 6 anomaly rules, unified screening, 8 chains, CSV export, cloud persistence.",
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
    "Agent-to-agent (A2A) attestation",
    "Trust scoring (0-100) with 5-factor breakdown",
    "Rule-based anomaly detection",
    "Agent reasoning logs",
    "Compliance certificate generation",
    "Human-in-the-loop task confirmation",
    "MCP server for AI coding assistants",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(softwareJsonLd),
          }}
        />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
