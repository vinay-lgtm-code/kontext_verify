import React from "react";
import { useCurrentFrame, interpolate, spring } from "remotion";
import { COLORS, FONTS, FRAME_RATE, baseContainer } from "../styles";

export const CTA: React.FC = () => {
  const frame = useCurrentFrame();

  // Shield logo animation
  const shieldScale = spring({
    frame,
    fps: FRAME_RATE,
    config: { damping: 10, stiffness: 100, mass: 0.6 },
  });

  // Shield pulse
  const pulsePhase = Math.sin((frame / FRAME_RATE) * Math.PI * 2 * 0.8);
  const shieldGlow = interpolate(pulsePhase, [-1, 1], [0.3, 0.8]);

  // npm install line
  const npmOpacity = interpolate(frame, [20, 38], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const npmY = interpolate(frame, [20, 38], [15, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // URLs
  const urlOpacity = interpolate(frame, [50, 68], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // GitHub line
  const ghOpacity = interpolate(frame, [65, 83], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div style={baseContainer}>
      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          top: "40%",
          left: "50%",
          width: 600,
          height: 400,
          transform: "translate(-50%, -50%)",
          background: `radial-gradient(ellipse, rgba(34, 197, 94, ${shieldGlow * 0.06}) 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      {/* Shield icon */}
      <div
        style={{
          transform: `scale(${shieldScale})`,
          marginBottom: 32,
        }}
      >
        <svg
          width="72"
          height="84"
          viewBox="0 0 72 84"
          fill="none"
          style={{
            filter: `drop-shadow(0 0 ${20 * shieldGlow}px ${COLORS.green}66)`,
          }}
        >
          {/* Shield shape */}
          <path
            d="M36 4L6 18V38C6 58 18 72 36 80C54 72 66 58 66 38V18L36 4Z"
            stroke={COLORS.green}
            strokeWidth="2.5"
            fill={`${COLORS.green}11`}
          />
          {/* Checkmark inside */}
          <path
            d="M24 42L32 50L48 34"
            stroke={COLORS.green}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </div>

      {/* KONTEXT wordmark */}
      <div
        style={{
          fontFamily: FONTS.sans,
          fontSize: 18,
          fontWeight: 700,
          color: COLORS.white,
          letterSpacing: "0.25em",
          textTransform: "uppercase",
          marginBottom: 40,
          opacity: interpolate(frame, [8, 25], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        KONTEXT
      </div>

      {/* npm install command */}
      <div
        style={{
          opacity: npmOpacity,
          transform: `translateY(${npmY}px)`,
          marginBottom: 28,
        }}
      >
        <div
          style={{
            backgroundColor: COLORS.bgTerminal,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 10,
            padding: "16px 32px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            boxShadow: `0 0 30px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.03)`,
          }}
        >
          <span
            style={{
              fontFamily: FONTS.mono,
              fontSize: 13,
              color: COLORS.textMuted,
            }}
          >
            $
          </span>
          <span
            style={{
              fontFamily: FONTS.mono,
              fontSize: 20,
              color: COLORS.green,
              fontWeight: 600,
            }}
          >
            npm install kontext-sdk
          </span>
        </div>
      </div>

      {/* Website URL */}
      <div
        style={{
          opacity: urlOpacity,
          fontFamily: FONTS.sans,
          fontSize: 18,
          color: COLORS.text,
          fontWeight: 500,
          marginBottom: 12,
        }}
      >
        getkontext.com
      </div>

      {/* GitHub link */}
      <div
        style={{
          opacity: ghOpacity,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        {/* GitHub icon */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill={COLORS.textDim}>
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
        </svg>
        <span
          style={{
            fontFamily: FONTS.mono,
            fontSize: 15,
            color: COLORS.textDim,
          }}
        >
          github.com/vinay-lgtm-code/kontext_verify
        </span>
      </div>
    </div>
  );
};
