"use client";

import { useEffect, useState, useCallback } from "react";

interface FlipTextProps {
  words: string[];
  interval?: number;
}

const CHAR_STAGGER_MS = 80;
const FLIP_DURATION_MS = 400;

export function FlipText({ words, interval = 2500 }: FlipTextProps) {
  const maxLen = Math.max(...words.map((w) => w.length));
  const padded = words.map((w) => w.padEnd(maxLen, " "));

  const [currentIndex, setCurrentIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState(0);
  const [flipping, setFlipping] = useState<boolean[]>(
    Array(maxLen).fill(false),
  );

  const triggerFlip = useCallback(
    (from: number, to: number) => {
      const fromWord = padded[from]!;
      const toWord = padded[to]!;

      for (let i = 0; i < maxLen; i++) {
        if (fromWord[i] !== toWord[i]) {
          setTimeout(() => {
            setFlipping((prev) => {
              const next = [...prev];
              next[i] = true;
              return next;
            });
          }, i * CHAR_STAGGER_MS);

          setTimeout(() => {
            setFlipping((prev) => {
              const next = [...prev];
              next[i] = false;
              return next;
            });
          }, i * CHAR_STAGGER_MS + FLIP_DURATION_MS);
        }
      }
    },
    [padded, maxLen],
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = (prev + 1) % words.length;
        setPrevIndex(prev);
        triggerFlip(prev, next);
        return next;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [words.length, interval, triggerFlip]);

  const currentWord = padded[currentIndex]!;
  const prevWord = padded[prevIndex]!;

  return (
    <span
      className="inline-flex text-[var(--ic-accent)]"
      aria-label={words[currentIndex]}
    >
      {Array.from({ length: maxLen }).map((_, i) => {
        const isFlipping = flipping[i];
        const displayChar = isFlipping ? prevWord[i] : currentWord[i];
        const nextChar = currentWord[i];
        const isEmpty = displayChar === " " && nextChar === " ";

        return (
          <span
            key={i}
            className="flip-char"
            style={{ width: isEmpty ? "0" : "1ch" }}
          >
            <span className="flip-char-inner">
              {/* Static / current character */}
              <span
                className={`flip-face flip-face-front${isFlipping ? " flip-out" : ""}`}
              >
                {displayChar}
              </span>
              {/* Incoming character */}
              <span
                className={`flip-face flip-face-back${isFlipping ? " flip-in" : ""}`}
              >
                {nextChar}
              </span>
            </span>
          </span>
        );
      })}
    </span>
  );
}
