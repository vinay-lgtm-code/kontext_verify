"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  showLineNumbers?: boolean;
}

function tokenize(code: string): React.ReactNode[] {
  const lines = code.split("\n");
  return lines.map((line, i) => {
    const tokens: React.ReactNode[] = [];
    let remaining = line;
    let key = 0;

    // Simple syntax highlighting
    const patterns: [RegExp, string][] = [
      [/^(\/\/.*)/, "token-comment"],
      [/^(import|from|export|const|let|var|async|await|return|new|if|else|function|class|interface|type)\b/, "token-keyword"],
      [/^("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/, "token-string"],
      [/^(\d+\.?\d*)/, "token-number"],
      [/^(true|false|null|undefined)\b/, "token-keyword"],
      [/^(=>|===|!==|&&|\|\||\.\.\.|\?\.)/, "token-operator"],
      [/^([{}()\[\];,.:])/, "token-punctuation"],
      [/^([a-zA-Z_$][a-zA-Z0-9_$]*)(?=\s*\()/, "token-function"],
      [/^([a-zA-Z_$][a-zA-Z0-9_$]*)(?=\s*:)/, "token-property"],
      [/^([a-zA-Z_$][a-zA-Z0-9_$]*)/, "token-variable"],
      [/^(\s+)/, ""],
      [/^(.)/, ""],
    ];

    while (remaining.length > 0) {
      let matched = false;
      for (const [pattern, className] of patterns) {
        const match = remaining.match(pattern);
        if (match) {
          const text = match[0];
          if (className) {
            tokens.push(
              <span key={`${i}-${key++}`} className={className}>
                {text}
              </span>
            );
          } else {
            tokens.push(<span key={`${i}-${key++}`}>{text}</span>);
          }
          remaining = remaining.slice(text.length);
          matched = true;
          break;
        }
      }
      if (!matched) {
        tokens.push(<span key={`${i}-${key++}`}>{remaining[0]}</span>);
        remaining = remaining.slice(1);
      }
    }

    return (
      <span key={i}>
        {tokens}
        {i < lines.length - 1 ? "\n" : ""}
      </span>
    );
  });
}

export function CodeBlock({
  code,
  language = "typescript",
  filename,
  showLineNumbers = false,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-block group relative">
      {filename && (
        <div className="flex items-center justify-between border-b border-white/5 px-4 py-2.5">
          <span className="text-xs text-muted-foreground font-mono">
            {filename}
          </span>
          <span className="text-xs text-muted-foreground/50">{language}</span>
        </div>
      )}
      <div className="relative">
        <pre className={showLineNumbers ? "pl-12" : ""}>
          <code>{tokenize(code.trim())}</code>
        </pre>
        <button
          onClick={handleCopy}
          className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground/50 opacity-0 transition-all hover:text-muted-foreground group-hover:opacity-100 bg-white/5 hover:bg-white/10"
          aria-label="Copy code"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
    </div>
  );
}
