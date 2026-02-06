import React from "react";
import { useCurrentFrame } from "remotion";
import { FONTS, COLORS } from "../styles";

interface TypewriterTextProps {
  text: string;
  startFrame: number;
  /** Characters per frame */
  speed?: number;
  style?: React.CSSProperties;
  color?: string;
  showCursor?: boolean;
  cursorColor?: string;
}

export const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  startFrame,
  speed = 1.2,
  style,
  color = COLORS.text,
  showCursor = true,
  cursorColor,
}) => {
  const frame = useCurrentFrame();
  const elapsed = Math.max(0, frame - startFrame);
  const charCount = Math.min(
    text.length,
    Math.floor(elapsed * speed)
  );
  const displayText = text.slice(0, charCount);
  const isComplete = charCount >= text.length;
  const cursorVisible = showCursor && !isComplete && Math.floor(elapsed / 8) % 2 === 0;

  return (
    <span
      style={{
        fontFamily: FONTS.mono,
        color,
        whiteSpace: "pre",
        ...style,
      }}
    >
      {displayText}
      {cursorVisible && (
        <span
          style={{
            color: cursorColor || color,
            opacity: 1,
          }}
        >
          |
        </span>
      )}
    </span>
  );
};
