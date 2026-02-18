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
    default: "Kontext — Compliance Logging for AI Payment Agents",
    template: "%s | Kontext",
  },
  description:
    "Compliance logging SDK for developers building on Circle Programmable Wallets. verify(), trust scoring, anomaly detection, and tamper-evident audit trails. GENIUS Act aligned.",
  keywords: [
    "USDC compliance SDK",
    "AI agent audit trail",
    "Circle Programmable Wallets compliance",
    "GENIUS Act developer",
    "stablecoin compliance",
    "trust scoring",
    "anomaly detection",
    "digest chain",
    "TypeScript SDK",
    "kontext-sdk",
  ],
  authors: [{ name: "Legaci Labs" }],
  creator: "Legaci Labs",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://getkontext.com",
    siteName: "Kontext",
    title: "Kontext — Compliance Logging for AI Payment Agents",
    description:
      "Five lines. Full compliance. verify(), trust scoring, anomaly detection, and tamper-evident audit trails for USDC payment agents.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Kontext — Compliance Logging for AI Payment Agents",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kontext — Compliance Logging for AI Payment Agents",
    description:
      "Five lines. Full compliance. GENIUS Act aligned SDK for autonomous wallet developers.",
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
