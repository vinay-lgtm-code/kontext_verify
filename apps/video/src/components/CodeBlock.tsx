import React from "react";
import { useCurrentFrame, interpolate } from "remotion";
import { COLORS, FONTS } from "../styles";

interface Token {
  text: string;
  color: string;
}

interface CodeBlockProps {
  lines: Token[][];
  startFrame: number;
  /** Frames per line to type out */
  framesPerLine?: number;
  style?: React.CSSProperties;
  showLineNumbers?: boolean;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  lines,
  startFrame,
  framesPerLine = 18,
  style,
  showLineNumbers = true,
}) => {
  const frame = useCurrentFrame();
  const elapsed = Math.max(0, frame - startFrame);

  return (
    <div
      style={{
        fontFamily: FONTS.mono,
        fontSize: 14,
        lineHeight: 1.75,
        ...style,
      }}
    >
      {lines.map((tokens, lineIdx) => {
        const lineStartFrame = lineIdx * framesPerLine;
        const lineElapsed = elapsed - lineStartFrame;
        if (lineElapsed < 0) return null;

        // Calculate total text length in this line
        const totalChars = tokens.reduce((sum, t) => sum + t.text.length, 0);
        const charsToShow = Math.min(
          totalChars,
          Math.floor(interpolate(
            lineElapsed,
            [0, framesPerLine * 0.8],
            [0, totalChars],
            { extrapolateRight: "clamp" }
          ))
        );

        let charsRendered = 0;

        return (
          <div key={lineIdx} style={{ display: "flex", minHeight: "1.75em" }}>
            {showLineNumbers && (
              <span
                style={{
                  color: COLORS.textMuted,
                  width: 36,
                  textAlign: "right",
                  marginRight: 16,
                  userSelect: "none",
                  flexShrink: 0,
                  fontSize: 13,
                }}
              >
                {lineIdx + 1}
              </span>
            )}
            <span>
              {tokens.map((token, tokenIdx) => {
                const tokenStart = charsRendered;
                charsRendered += token.text.length;
                const visible = Math.max(
                  0,
                  Math.min(token.text.length, charsToShow - tokenStart)
                );
                if (visible === 0) return null;
                return (
                  <span key={tokenIdx} style={{ color: token.color }}>
                    {token.text.slice(0, visible)}
                  </span>
                );
              })}
            </span>
          </div>
        );
      })}
    </div>
  );
};

// Helper to create tokens easily
export const t = (text: string, color: string): Token => ({ text, color });
