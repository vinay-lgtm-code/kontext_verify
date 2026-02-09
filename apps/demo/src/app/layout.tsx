import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kontext Interactive Demo - Trust & Compliance for Agentic Stablecoins",
  description:
    "Watch Kontext build tamper-evident audit trails in real-time as an AI agent executes financial operations. Cryptographic digest chains, OFAC sanctions screening, trust scoring.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  );
}
