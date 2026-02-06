import React from "react";
import { useCurrentFrame, spring, interpolate } from "remotion";
import { COLORS, FONTS, FRAME_RATE } from "../styles";

interface CheckmarkLineProps {
  text: string;
  startFrame: number;
  color?: string;
  checkColor?: string;
  fontSize?: number;
}

export const CheckmarkLine: React.FC<CheckmarkLineProps> = ({
  text,
  startFrame,
  color = COLORS.text,
  checkColor = COLORS.green,
  fontSize = 16,
}) => {
  const frame = useCurrentFrame();
  const elapsed = Math.max(0, frame - startFrame);

  const checkScale = spring({
    frame: elapsed,
    fps: FRAME_RATE,
    config: {
      damping: 12,
      stiffness: 200,
      mass: 0.4,
    },
  });

  const textOpacity = interpolate(elapsed, [4, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const slideX = interpolate(elapsed, [4, 14], [12, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  if (elapsed < 0) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        fontFamily: FONTS.mono,
        fontSize,
        lineHeight: 1.8,
      }}
    >
      <span
        style={{
          color: checkColor,
          transform: `scale(${checkScale})`,
          display: "inline-block",
          fontWeight: 700,
          fontSize: fontSize + 2,
        }}
      >
        {"\u2713"}
      </span>
      <span
        style={{
          color,
          opacity: textOpacity,
          transform: `translateX(${slideX}px)`,
        }}
      >
        {text}
      </span>
    </div>
  );
};
