import React from "react";
import { useCurrentFrame, spring, interpolate } from "remotion";
import { COLORS, FONTS, FRAME_RATE } from "../styles";

interface DigestChainProps {
  startFrame: number;
}

const BLOCKS = [
  { hash: "a7f3c2...", label: "H_0", color: COLORS.blue },
  { hash: "e91b4d...", label: "H_1", color: COLORS.purple },
  { hash: "3c8f7a...", label: "H_2", color: COLORS.cyan },
  { hash: "f2d6e1...", label: "H_D", color: COLORS.green },
];

export const DigestChain: React.FC<DigestChainProps> = ({ startFrame }) => {
  const frame = useCurrentFrame();
  const elapsed = Math.max(0, frame - startFrame);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 0,
        padding: "16px 0",
      }}
    >
      {BLOCKS.map((block, i) => {
        const blockDelay = i * 15;
        const blockElapsed = Math.max(0, elapsed - blockDelay);

        const scale = spring({
          frame: blockElapsed,
          fps: FRAME_RATE,
          config: { damping: 14, stiffness: 180, mass: 0.5 },
        });

        const opacity = interpolate(blockElapsed, [0, 8], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        // Arrow between blocks
        const arrowDelay = blockDelay + 8;
        const arrowElapsed = Math.max(0, elapsed - arrowDelay);
        const arrowOpacity = interpolate(arrowElapsed, [0, 6], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const arrowWidth = interpolate(arrowElapsed, [0, 10], [0, 40], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        return (
          <React.Fragment key={i}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                transform: `scale(${scale})`,
                opacity,
              }}
            >
              {/* Block */}
              <div
                style={{
                  width: 120,
                  height: 64,
                  borderRadius: 8,
                  border: `2px solid ${block.color}`,
                  backgroundColor: `${block.color}11`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: `0 0 20px ${block.color}22, inset 0 0 20px ${block.color}08`,
                }}
              >
                <span
                  style={{
                    fontFamily: FONTS.mono,
                    fontSize: 11,
                    color: block.color,
                    opacity: 0.7,
                    fontWeight: 600,
                    letterSpacing: "0.05em",
                  }}
                >
                  {block.label}
                </span>
                <span
                  style={{
                    fontFamily: FONTS.mono,
                    fontSize: 13,
                    color: COLORS.text,
                    marginTop: 2,
                  }}
                >
                  {block.hash}
                </span>
              </div>
            </div>
            {/* Arrow connector */}
            {i < BLOCKS.length - 1 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  opacity: arrowOpacity,
                  overflow: "hidden",
                  width: arrowWidth,
                  flexShrink: 0,
                }}
              >
                <svg width={40} height={20} viewBox="0 0 40 20">
                  <line
                    x1="0"
                    y1="10"
                    x2="30"
                    y2="10"
                    stroke={COLORS.textMuted}
                    strokeWidth="2"
                    strokeDasharray="4,3"
                  />
                  <polygon
                    points="28,5 38,10 28,15"
                    fill={COLORS.textMuted}
                  />
                </svg>
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
