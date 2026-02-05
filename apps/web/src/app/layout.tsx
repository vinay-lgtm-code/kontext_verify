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
    default: "Kontext - Trust Layer for the Agent Economy",
    template: "%s | Kontext",
  },
  description:
    "Compliance and trust infrastructure for agentic stablecoin transactions. Action logging, audit export, trust scoring, and anomaly detection for USDC, x402, and more.",
  keywords: [
    "agentic commerce",
    "stablecoin compliance",
    "USDC",
    "x402 protocol",
    "trust scoring",
    "audit trail",
    "GENIUS Act",
    "agent economy",
    "crypto compliance",
    "TypeScript SDK",
  ],
  authors: [{ name: "Kontext" }],
  creator: "Kontext",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://kontext.dev",
    siteName: "Kontext",
    title: "Kontext - Trust Layer for the Agent Economy",
    description:
      "Compliance and trust infrastructure for agentic stablecoin transactions. Built for the GENIUS Act era.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Kontext - Trust Layer for the Agent Economy",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kontext - Trust Layer for the Agent Economy",
    description:
      "Compliance and trust infrastructure for agentic stablecoin transactions.",
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
      className={`dark ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen bg-background font-sans antialiased">
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
