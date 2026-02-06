import React from "react";
import { useCurrentFrame, interpolate, spring } from "remotion";
import { COLORS, FONTS, FRAME_RATE, baseContainer } from "../styles";

interface StatCardProps {
  value: string;
  label: string;
  color: string;
  delay: number;
}

const StatCard: React.FC<StatCardProps> = ({ value, label, color, delay }) => {
  const frame = useCurrentFrame();
  const elapsed = Math.max(0, frame - delay);

  const scale = spring({
    frame: elapsed,
    fps: FRAME_RATE,
    config: { damping: 12, stiffness: 200, mass: 0.5 },
  });

  const opacity = interpolate(elapsed, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        transform: `scale(${scale})`,
        opacity,
      }}
    >
      <div
        style={{
          fontFamily: FONTS.mono,
          fontSize: 36,
          fontWeight: 800,
          color,
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: FONTS.sans,
          fontSize: 14,
          color: COLORS.textDim,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        {label}
      </div>
    </div>
  );
};

interface IntegrationBadgeProps {
  name: string;
  delay: number;
}

const IntegrationBadge: React.FC<IntegrationBadgeProps> = ({ name, delay }) => {
  const frame = useCurrentFrame();
  const elapsed = Math.max(0, frame - delay);

  const opacity = interpolate(elapsed, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const y = interpolate(elapsed, [0, 12], [8, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${y}px)`,
        padding: "8px 20px",
        borderRadius: 8,
        backgroundColor: COLORS.bgLight,
        border: `1px solid ${COLORS.border}`,
        fontFamily: FONTS.sans,
        fontSize: 14,
        color: COLORS.text,
        fontWeight: 500,
        letterSpacing: "0.01em",
      }}
    >
      {name}
    </div>
  );
};

export const TheNumbers: React.FC = () => {
  const frame = useCurrentFrame();

  // Title
  const titleOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const titleY = interpolate(frame, [0, 15], [15, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Divider line
  const dividerWidth = interpolate(frame, [80, 110], [0, 300], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Fade out
  const fadeOut = interpolate(frame, [190, 210], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div style={{ ...baseContainer, opacity: fadeOut }}>
      {/* Title */}
      <div
        style={{
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          fontFamily: FONTS.sans,
          fontSize: 16,
          fontWeight: 500,
          color: COLORS.textDim,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          marginBottom: 48,
        }}
      >
        Built for production
      </div>

      {/* Stats grid */}
      <div
        style={{
          display: "flex",
          gap: 72,
          marginBottom: 48,
        }}
      >
        <StatCard value="357" label="Tests Passing" color={COLORS.green} delay={15} />
        <StatCard value="8" label="Chains Supported" color={COLORS.blue} delay={30} />
        <StatCard value="0" label="Dependencies" color={COLORS.purple} delay={45} />
        <StatCard value="MIT" label="Licensed" color={COLORS.cyan} delay={60} />
      </div>

      {/* Divider */}
      <div
        style={{
          width: dividerWidth,
          height: 1,
          backgroundColor: COLORS.border,
          marginBottom: 40,
        }}
      />

      {/* Integration badges */}
      <div
        style={{
          fontFamily: FONTS.sans,
          fontSize: 12,
          color: COLORS.textMuted,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          marginBottom: 16,
          opacity: interpolate(frame, [90, 105], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        Integrations
      </div>
      <div
        style={{
          display: "flex",
          gap: 12,
        }}
      >
        <IntegrationBadge name="Vercel AI SDK" delay={100} />
        <IntegrationBadge name="LangChain" delay={112} />
        <IntegrationBadge name="Stripe" delay={124} />
        <IntegrationBadge name="Circle" delay={136} />
      </div>
    </div>
  );
};
