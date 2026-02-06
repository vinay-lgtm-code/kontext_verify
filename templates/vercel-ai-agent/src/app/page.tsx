import { Chat } from '@/components/chat';

export default function Home() {
  return (
    <main className="flex flex-col min-h-screen">
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                              */}
      {/* ------------------------------------------------------------------ */}
      <header className="border-b border-kontext-border bg-kontext-surface/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Kontext logo mark */}
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-kontext-accent to-purple-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">K</span>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-kontext-text">
                AI Agent + Kontext
              </h1>
              <p className="text-xs text-kontext-muted">
                Compliance-aware stablecoin transactions
              </p>
            </div>
          </div>

          {/* Status indicator */}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-kontext-success status-pulse" />
            <span className="text-xs text-kontext-muted">Audit Active</span>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Chat Area                                                           */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex-1 max-w-3xl w-full mx-auto">
        <Chat />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Footer                                                              */}
      {/* ------------------------------------------------------------------ */}
      <footer className="border-t border-kontext-border py-3">
        <div className="max-w-3xl mx-auto px-4 flex items-center justify-between">
          <a
            href="https://getkontext.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-kontext-muted hover:text-kontext-text transition-colors"
          >
            <div className="w-4 h-4 rounded bg-gradient-to-br from-kontext-accent to-purple-500 flex items-center justify-center">
              <span className="text-white font-bold" style={{ fontSize: '8px' }}>
                K
              </span>
            </div>
            Powered by Kontext
          </a>
          <div className="flex items-center gap-4 text-xs text-kontext-muted">
            <a
              href="https://www.npmjs.com/package/kontext-sdk"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-kontext-text transition-colors"
            >
              npm
            </a>
            <a
              href="https://github.com/vinay-lgtm-code/kontext_verify"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-kontext-text transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
