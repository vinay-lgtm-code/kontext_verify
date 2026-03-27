import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { UrgencyBanner } from "@/components/urgency-banner";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <UrgencyBanner />
      <Navbar />
      <main>{children}</main>
      <Footer />
    </>
  );
}
