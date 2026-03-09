import type { Metadata } from "next";
import { Martian_Mono } from "next/font/google";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import "./globals.css";

const martianMono = Martian_Mono({
  subsets: ["latin"],
  variable: "--font-martian-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://getkontext.com"),
  title: {
    default: "Kontext — Payment lifecycle management for modern fintech",
    template: "%s | Kontext",
  },
  description:
    "Payment Control Plane SDK. 8-stage payment lifecycle, policy engine, provider adapters, and ops dashboard. Track every payment from intent to reconciliation. TypeScript-first. Zero dependencies.",
  keywords: [
    "payment control plane",
    "payment lifecycle SDK",
    "payment orchestration",
    "stablecoin payments",
    "USDC payments SDK",
    "payment compliance",
    "payment policy engine",
    "fintech infrastructure",
    "TypeScript payment SDK",
    "payment monitoring",
    "payment reconciliation",
    "workspace profiles",
    "provider adapters",
    "GENIUS Act",
    "payment operations dashboard",
  ],
  authors: [{ name: "Kontext" }],
  creator: "Kontext",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://getkontext.com",
    siteName: "Kontext",
    title: "Kontext — Payment lifecycle management for modern fintech",
    description:
      "Payment Control Plane SDK. 8-stage lifecycle, policy engine, 6 provider adapters. From intent to reconciliation.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Kontext — Payment Control Plane",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kontext — Payment lifecycle management for modern fintech",
    description:
      "Payment Control Plane SDK. 8-stage lifecycle, policy engine, provider adapters. Free tier included.",
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
  softwareVersion: "1.0.0",
  license: "https://opensource.org/licenses/MIT",
  url: "https://getkontext.com",
  downloadUrl: "https://www.npmjs.com/package/kontext-sdk",
  codeRepository: "https://github.com/Legaci-Labs/kontext",
  description:
    "Payment Control Plane SDK for modern fintech. 8-stage payment lifecycle, policy engine with OFAC screening, 6 provider adapters, ops dashboard. Zero runtime dependencies.",
  offers: [
    {
      "@type": "Offer",
      name: "Free",
      price: "0",
      priceCurrency: "USD",
      description: "20,000 payment stage events/month. Core lifecycle, policy engine, digest chain.",
    },
    {
      "@type": "Offer",
      name: "Pro",
      price: "0.002",
      priceCurrency: "USD",
      unitText: "per payment stage event above 20K free",
      description: "All chains, advanced policies, CSV export, ops dashboard, cloud persistence.",
    },
  ],
  author: {
    "@type": "Organization",
    name: "Legaci Labs Inc.",
  },
  featureList: [
    "8-stage payment lifecycle (intent to reconciliation)",
    "Policy engine with OFAC sanctions screening",
    "6 provider adapters (EVM, Solana, Circle, x402, Bridge, Modern Treasury)",
    "5 workspace profiles (micropayments, treasury, invoicing, payroll, cross-border)",
    "Tamper-evident SHA-256 digest chain",
    "Ops dashboard with 5 views",
    "Slack and email notifications",
    "CSV and JSON audit export",
    "ERC-8021 transaction attribution",
    "Human-in-the-loop review workflows",
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
      className={martianMono.variable}
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
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
