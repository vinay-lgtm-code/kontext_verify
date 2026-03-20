"use client";

import { useEffect, useState } from "react";

interface FlipTextProps {
  words: string[];
  interval?: number;
}

export function FlipText({ words, interval = 2500 }: FlipTextProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % words.length);
        setIsAnimating(false);
      }, 300);
    }, interval);

    return () => clearInterval(timer);
  }, [words.length, interval]);

  return (
    <span
      className="inline-block overflow-hidden align-bottom text-[var(--ic-accent)]"
      style={{ height: "1.15em" }}
      aria-label={words[currentIndex]}
    >
      <span
        className="inline-block transition-transform duration-300 ease-in-out"
        style={{
          transform: isAnimating ? "translateY(-100%)" : "translateY(0)",
          opacity: isAnimating ? 0 : 1,
          transition: "transform 0.3s ease-in-out, opacity 0.3s ease-in-out",
        }}
      >
        {words[currentIndex]}
      </span>
    </span>
  );
}
