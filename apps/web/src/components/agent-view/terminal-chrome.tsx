interface TerminalChromeProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function TerminalChrome({
  title = "kontext",
  children,
  className = "",
}: TerminalChromeProps) {
  return (
    <div
      className={`rounded-lg border border-[var(--ic-border)] bg-[var(--ic-surface)] ${className}`}
    >
      <div className="flex items-center gap-2 border-b border-[var(--ic-border)] px-4 py-2.5">
        <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57] opacity-60" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e] opacity-60" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#28c840] opacity-60" />
        <span className="ml-2 text-xs text-[var(--ic-text-dim)]">{title}</span>
      </div>
      <div className="p-4 sm:p-6">{children}</div>
    </div>
  );
}
