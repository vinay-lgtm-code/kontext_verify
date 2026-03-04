"use client";

import { useState, useEffect, useRef } from "react";

interface TypingAnimationProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
  className?: string;
  highlightWords?: string[];
}

export function TypingAnimation({
  text,
  speed = 40,
  onComplete,
  className = "",
  highlightWords = [],
}: TypingAnimationProps) {
  const [displayed, setDisplayed] = useState("");
  const [showCursor, setShowCursor] = useState(true);
  const indexRef = useRef(0);
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (prefersReducedMotion) {
      setDisplayed(text);
      setShowCursor(true);
      onComplete?.();
      return;
    }

    indexRef.current = 0;
    setDisplayed("");

    const interval = setInterval(() => {
      indexRef.current++;
      setDisplayed(text.slice(0, indexRef.current));
      if (indexRef.current >= text.length) {
        clearInterval(interval);
        onComplete?.();
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, onComplete, prefersReducedMotion]);

  const renderText = () => {
    if (highlightWords.length === 0) return displayed;

    const regex = new RegExp(`(${highlightWords.join("|")})`, "g");
    const parts = displayed.split(regex);

    return parts.map((part, i) =>
      highlightWords.includes(part) ? (
        <span key={i} className="text-[var(--term-green)] glow">
          {part}
        </span>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  return (
    <span className={className}>
      {renderText()}
      {showCursor && (
        <span className="cursor inline-block ml-0.5" aria-hidden="true" />
      )}
    </span>
  );
}
