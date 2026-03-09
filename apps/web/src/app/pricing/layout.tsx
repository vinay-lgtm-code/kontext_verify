import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Simple, transparent pricing for Kontext. Start free with 20K payment stage events/month. Pay as you go for multi-chain, ops dashboard, and advanced policy configurations.",
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
