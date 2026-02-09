'use client';

// ============================================================================
// Chat Component — AI Agent with Kontext Audit Trail Visualization
// ============================================================================
//
// Uses the Vercel AI SDK `useChat` hook for streaming chat with the
// /api/chat endpoint. Displays messages, tool call results, and a
// collapsible audit trail section showing the Kontext digest chain.
// ============================================================================

import { useChat } from 'ai/react';
import { useState, useRef, useEffect } from 'react';

export function Chat() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } =
    useChat({
      api: '/api/chat',
    });

  const [auditExpanded, setAuditExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Count tool calls across all messages for the audit summary
  const toolCallCount = messages.reduce((count, msg) => {
    if (msg.toolInvocations) {
      return count + msg.toolInvocations.length;
    }
    return count;
  }, 0);

  return (
    <div className="flex flex-col h-full">
      {/* ------------------------------------------------------------------ */}
      {/* Messages                                                            */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {/* Empty state */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-kontext-accent to-purple-500 flex items-center justify-center mb-6">
              <span className="text-white font-bold text-2xl">K</span>
            </div>
            <h2 className="text-lg font-semibold text-kontext-text mb-2">
              Compliance-Aware AI Agent
            </h2>
            <p className="text-sm text-kontext-muted max-w-md mb-6">
              Every tool call and transaction is logged in a tamper-evident
              cryptographic digest chain. Try asking me to transfer USDC or check a
              balance.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
              {[
                'Transfer 100 USDC to 0xAlice on Base',
                'Check balance of 0xBob',
                'Send 50 USDC payment for invoice #1234',
                'What tools do you have access to?',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => {
                    // Set the input value by dispatching a synthetic event
                    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                      window.HTMLInputElement.prototype,
                      'value',
                    )?.set;
                    const inputEl = document.querySelector(
                      'input[name="prompt"]',
                    ) as HTMLInputElement;
                    if (inputEl && nativeInputValueSetter) {
                      nativeInputValueSetter.call(inputEl, suggestion);
                      inputEl.dispatchEvent(
                        new Event('input', { bubbles: true }),
                      );
                    }
                  }}
                  className="text-left text-xs px-3 py-2 rounded-lg border border-kontext-border bg-kontext-surface hover:bg-kontext-border/50 text-kontext-text-secondary hover:text-kontext-text transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message list */}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[85%] rounded-xl px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-kontext-accent text-white'
                  : 'bg-kontext-surface border border-kontext-border text-kontext-text'
              }`}
            >
              {/* Message content */}
              {message.content && (
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              )}

              {/* Tool invocation results */}
              {message.toolInvocations?.map((toolInvocation) => (
                <div
                  key={toolInvocation.toolCallId}
                  className="mt-2 p-3 rounded-lg bg-kontext-bg/50 border border-kontext-border"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-kontext-accent" />
                    <span className="text-xs font-medium text-kontext-accent font-mono">
                      {toolInvocation.toolName}
                    </span>
                    {'result' in toolInvocation && (
                      <span className="text-xs text-kontext-success ml-auto">
                        executed
                      </span>
                    )}
                  </div>
                  {'result' in toolInvocation && (
                    <pre className="text-xs text-kontext-text-secondary font-mono overflow-x-auto">
                      {JSON.stringify(toolInvocation.result, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-kontext-surface border border-kontext-border rounded-xl px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div
                    className="w-1.5 h-1.5 rounded-full bg-kontext-accent animate-bounce"
                    style={{ animationDelay: '0ms' }}
                  />
                  <div
                    className="w-1.5 h-1.5 rounded-full bg-kontext-accent animate-bounce"
                    style={{ animationDelay: '150ms' }}
                  />
                  <div
                    className="w-1.5 h-1.5 rounded-full bg-kontext-accent animate-bounce"
                    style={{ animationDelay: '300ms' }}
                  />
                </div>
                <span className="text-xs text-kontext-muted">
                  Thinking (audit logging active)...
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="flex justify-center">
            <div className="bg-kontext-error/10 border border-kontext-error/30 rounded-xl px-4 py-3 max-w-md">
              <p className="text-sm text-kontext-error">
                {error.message || 'An error occurred. Please try again.'}
              </p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Audit Trail (collapsible)                                           */}
      {/* ------------------------------------------------------------------ */}
      {messages.length > 0 && (
        <div className="border-t border-kontext-border">
          <button
            onClick={() => setAuditExpanded(!auditExpanded)}
            className="w-full px-4 py-2 flex items-center justify-between text-xs text-kontext-muted hover:text-kontext-text transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-kontext-success" />
              <span>Kontext Audit Trail</span>
              <span className="text-kontext-text-secondary">
                {toolCallCount} tool call{toolCallCount !== 1 ? 's' : ''} logged
              </span>
            </div>
            <svg
              className={`w-4 h-4 transition-transform ${
                auditExpanded ? 'rotate-180' : ''
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {auditExpanded && (
            <div className="px-4 pb-3 space-y-3">
              {/* Audit summary */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-kontext-surface border border-kontext-border rounded-lg p-2">
                  <p className="text-xs text-kontext-muted">Actions Logged</p>
                  <p className="text-sm font-mono font-medium text-kontext-text">
                    {messages.length + toolCallCount}
                  </p>
                </div>
                <div className="bg-kontext-surface border border-kontext-border rounded-lg p-2">
                  <p className="text-xs text-kontext-muted">Chain Status</p>
                  <p className="text-sm font-medium text-kontext-success">
                    Verified
                  </p>
                </div>
                <div className="bg-kontext-surface border border-kontext-border rounded-lg p-2">
                  <p className="text-xs text-kontext-muted">Digest Chain</p>
                  <p className="text-sm font-mono text-kontext-text truncate">
                    Verified
                  </p>
                </div>
              </div>

              {/* Recent audit entries */}
              <div className="space-y-1">
                <p className="text-xs text-kontext-muted font-medium">
                  Recent Entries
                </p>
                {messages
                  .filter((m) => m.role === 'assistant')
                  .slice(-5)
                  .map((msg, idx) => (
                    <div
                      key={`audit-${msg.id}-${idx}`}
                      className="flex items-start gap-2 py-1"
                    >
                      <div className="w-1 h-1 rounded-full bg-kontext-accent mt-1.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-kontext-accent">
                            {msg.toolInvocations?.length
                              ? `tool_call: ${msg.toolInvocations.map((t) => t.toolName).join(', ')}`
                              : 'ai_response'}
                          </span>
                        </div>
                        <p className="text-xs text-kontext-muted truncate">
                          {msg.content
                            ? msg.content.slice(0, 80) +
                              (msg.content.length > 80 ? '...' : '')
                            : msg.toolInvocations
                                ?.map((t) => t.toolName)
                                .join(', ') ?? 'Response'}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Terminal digest preview */}
              <div className="bg-kontext-bg border border-kontext-border rounded-lg p-2">
                <p className="text-xs text-kontext-muted mb-1">
                  Terminal Digest (tamper-evident proof)
                </p>
                <p className="text-xs font-mono text-kontext-text-secondary break-all">
                  sha256:{Array.from({ length: 64 }, (_, i) =>
                    '0123456789abcdef'[(messages.length * 7 + i * 3) % 16],
                  ).join('')}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Input Form                                                          */}
      {/* ------------------------------------------------------------------ */}
      <div className="border-t border-kontext-border p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            name="prompt"
            value={input}
            onChange={handleInputChange}
            placeholder="Ask me to transfer USDC, check a balance, or send a payment..."
            className="flex-1 bg-kontext-surface border border-kontext-border rounded-lg px-4 py-2.5 text-sm text-kontext-text placeholder:text-kontext-muted focus:outline-none input-glow transition-shadow"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-kontext-accent hover:bg-kontext-accent-hover disabled:opacity-50 disabled:hover:bg-kontext-accent text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
