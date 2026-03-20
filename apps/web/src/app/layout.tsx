import type { Metadata } from "next";
import { DM_Sans, IBM_Plex_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { CookieConsentBanner } from "../components/cookie-consent";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://getkontext.com"),
  title: {
    default: "Kontext — Compliance Audit Trails for Programmable Payments",
    template: "%s | Kontext",
  },
  description:
    "Kontext creates audit-defensible evidence trails for programmable payments — stablecoin, fiat, card, and ACH. Patented tamper-evident logging, OFAC screening, and compliance-grade proof across wallets, treasury systems, and payment orchestration.",
  keywords: [
    "compliance audit trail",
    "programmable payments compliance",
    "ACH compliance",
    "treasury compliance audit trail",
    "payment orchestration compliance",
    "multi-rail compliance",
    "OFAC screening",
    "payment evidence trail",
    "GENIUS Act compliance",
    "AI agent audit trail",
    "tamper-evident logging",
    "payment compliance SDK",
    "USDC compliance",
    "Circle Programmable Wallets compliance",
    "TypeScript SDK",
  ],
  authors: [{ name: "Kontext" }],
  creator: "Kontext",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://getkontext.com",
    siteName: "Kontext",
    title: "Kontext — Compliance Audit Trails for Programmable Payments",
    description:
      "Audit-defensible evidence trails for programmable payments across stablecoin, fiat, card, and ACH rails. Patented tamper-evident logging and OFAC screening for compliance teams.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Kontext — Compliance Audit Trails for Programmable Payments",
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
  softwareVersion: "0.12.0",
  license: "https://opensource.org/licenses/MIT",
  url: "https://getkontext.com",
  downloadUrl: "https://www.npmjs.com/package/kontext-sdk",
  codeRepository: "https://github.com/Legaci-Labs/kontext",
  description:
    "Compliance-grade audit trails for programmable payments. OFAC screening, tamper-evident logging, and cryptographic proof. Zero runtime dependencies.",
  offers: [
    {
      "@type": "Offer",
      name: "Starter",
      description: "For teams standing up programmable payments controls. 1 environment, capped volume, core evidence features.",
    },
    {
      "@type": "Offer",
      name: "Growth",
      description: "For payment infrastructure companies with active compliance teams. Multiple environments, RBAC, SAR/CTR, multi-chain.",
    },
    {
      "@type": "Offer",
      name: "Enterprise",
      description: "For regulated platforms with multi-rail programs and audit requirements. Custom volumes, extended retention, GRC integrations.",
    },
  ],
  author: {
    "@type": "Organization",
    name: "Legaci Labs Inc.",
  },
  featureList: [
    "Transaction verification with OFAC screening",
    "Tamper-evident SHA-256 digest chain",
    "Compliance-grade audit trails",
    "Intent hashing and context binding",
    "Trust scoring with 5-factor breakdown",
    "Rule-based anomaly detection",
    "Audit-ready evidence export (JSON/CSV)",
    "Human-in-the-loop task confirmation",
    "SAR/CTR report templates",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Static JSON-LD structured data (hardcoded, not user input)
  const jsonLdScripts = [
    JSON.stringify(organizationJsonLd),
    JSON.stringify(softwareJsonLd),
  ];

  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${ibmPlexMono.variable} ${instrumentSerif.variable}`}
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
      <body className="min-h-screen bg-background font-sans antialiased">
        <CookieConsentBanner />
        {children}
      </body>
    </html>
  );
}
