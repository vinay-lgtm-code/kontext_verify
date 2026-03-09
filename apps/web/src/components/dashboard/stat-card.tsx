interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  color?: "green" | "red" | "amber" | "blue" | "default";
}

const colorMap = {
  green: "text-[#4ade80]",
  red: "text-[#f87171]",
  amber: "text-[#fbbf24]",
  blue: "text-[#60a5fa]",
  default: "text-[#fafafa]",
};

export function StatCard({ label, value, subtext, color = "default" }: StatCardProps) {
  return (
    <div className="border border-[#27272a] bg-[#18181b] p-4">
      <div className="text-xs text-[#71717a] uppercase tracking-wider mb-2">{label}</div>
      <div className={`text-2xl font-bold ${colorMap[color]}`}>{value}</div>
      {subtext && <div className="text-xs text-[#a1a1aa] mt-1">{subtext}</div>}
    </div>
  );
}
