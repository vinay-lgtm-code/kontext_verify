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
      className={`border border-[var(--term-surface-2)] bg-[var(--term-surface)] ${className}`}
    >
      <div className="flex items-center gap-2 border-b border-[var(--term-surface-2)] px-4 py-2.5">
        <span className="w-2.5 h-2.5 rounded-full bg-[var(--term-red)] opacity-60" />
        <span className="w-2.5 h-2.5 rounded-full bg-[var(--term-amber)] opacity-60" />
        <span className="w-2.5 h-2.5 rounded-full bg-[var(--term-green)] opacity-60" />
        <span className="ml-2 text-xs text-[var(--term-text-3)]">{title}</span>
      </div>
      <div className="p-4 sm:p-6">{children}</div>
    </div>
  );
}
