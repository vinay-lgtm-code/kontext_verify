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
  metadataBase: new URL("https://kontext.dev"),
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
    url: "https://kontext.dev",
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
      <body className="min-h-screen bg-background font-sans antialiased">
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
