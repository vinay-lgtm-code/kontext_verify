import Link from "next/link";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Needs Action" },
  { href: "/dashboard/attempts", label: "All Attempts" },
  { href: "/dashboard/failures", label: "Failures" },
  { href: "/dashboard/billing", label: "Usage" },
  { href: "/dashboard/health", label: "Health" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] font-mono">
      {/* Top bar */}
      <header className="border-b border-[#27272a] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-[#4ade80] font-bold text-sm tracking-wider">
            $ kontext
          </Link>
          <span className="text-[#71717a] text-xs">dashboard</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#71717a]">ws_default</span>
          <div className="w-2 h-2 rounded-full bg-[#4ade80] shadow-[0_0_6px_rgba(74,222,128,0.5)]" />
        </div>
      </header>

      {/* Nav tabs */}
      <nav className="border-b border-[#27272a] px-6 flex gap-0">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="px-4 py-2.5 text-xs text-[#a1a1aa] hover:text-[#fafafa] hover:bg-[#18181b] border-r border-[#27272a] transition-colors"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Main content */}
      <main className="p-6">{children}</main>
    </div>
  );
}
