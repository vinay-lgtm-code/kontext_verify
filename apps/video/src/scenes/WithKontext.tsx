import React from "react";
import { useCurrentFrame, interpolate, spring } from "remotion";
import { Terminal } from "../components/Terminal";
import { CodeBlock, t } from "../components/CodeBlock";
import { CheckmarkLine } from "../components/CheckmarkLine";
import { DigestChain } from "../components/DigestChain";
import { COLORS, FONTS, FRAME_RATE, baseContainer } from "../styles";

export const WithKontext: React.FC = () => {
  const frame = useCurrentFrame();

  // Scene entrance
  const fadeIn = interpolate(frame, [0, 25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Label
  const labelOpacity = interpolate(frame, [5, 25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Title
  const titleOpacity = interpolate(frame, [10, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const titleY = interpolate(frame, [10, 30], [12, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Terminal
  const terminalOpacity = interpolate(frame, [25, 45], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Code: import and setup
  const codeLines = [
    [
      t("import", COLORS.keyword),
      t(" { ", COLORS.operator),
      t("Kontext", COLORS.type),
      t(" } ", COLORS.operator),
      t("from ", COLORS.keyword),
      t("'kontext-sdk'", COLORS.string),
      t(";", COLORS.operator),
    ],
    [t("", COLORS.text)], // blank line
    [
      t("const ", COLORS.keyword),
      t("ctx", COLORS.text),
      t(" = ", COLORS.operator),
      t("new ", COLORS.keyword),
      t("Kontext", COLORS.type),
      t("({ ", COLORS.operator),
      t("chain", COLORS.text),
      t(": ", COLORS.operator),
      t("'base'", COLORS.string),
      t(" });", COLORS.operator),
    ],
    [t("", COLORS.text)], // blank line
    [
      t("const ", COLORS.keyword),
      t("result", COLORS.text),
      t(" = ", COLORS.operator),
      t("await ", COLORS.keyword),
      t("ctx", COLORS.text),
      t(".", COLORS.operator),
      t("verify", COLORS.func),
      t("({", COLORS.operator),
    ],
    [
      t("  action", COLORS.text),
      t(": ", COLORS.operator),
      t("'transfer'", COLORS.string),
      t(",", COLORS.operator),
    ],
    [
      t("  amount", COLORS.text),
      t(": ", COLORS.operator),
      t("'50000.00'", COLORS.string),
      t(",", COLORS.operator),
    ],
    [
      t("  currency", COLORS.text),
      t(": ", COLORS.operator),
      t("'USDC'", COLORS.string),
      t(",", COLORS.operator),
    ],
    [
      t("  agent", COLORS.text),
      t(": ", COLORS.operator),
      t("'treasury-agent-v3'", COLORS.string),
      t(",", COLORS.operator),
    ],
    [
      t("});", COLORS.operator),
    ],
  ];

  // Checkmarks start after code finishes typing
  const checkStartFrame = 300;
  const checkGap = 28;

  // Digest chain visualization
  const chainStartFrame = checkStartFrame + checkGap * 5 + 20;

  // Green glow background pulse
  const glowOpacity = interpolate(
    frame,
    [checkStartFrame, checkStartFrame + 60],
    [0, 0.08],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Fade out
  const fadeOut = interpolate(frame, [720, 750], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        ...baseContainer,
        opacity: Math.min(fadeIn, fadeOut),
      }}
    >
      {/* Subtle green ambient glow */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: 800,
          height: 600,
          transform: "translate(-50%, -50%)",
          background: `radial-gradient(ellipse, ${COLORS.green}${Math.round(glowOpacity * 255)
            .toString(16)
            .padStart(2, "0")} 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      {/* Scene label */}
      <div
        style={{
          position: "absolute",
          top: 32,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6,
        }}
      >
        <div
          style={{
            opacity: labelOpacity,
            fontFamily: FONTS.sans,
            fontSize: 14,
            fontWeight: 500,
            color: COLORS.green,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}
        >
          With Kontext
        </div>
        <div
          style={{
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
            fontFamily: FONTS.sans,
            fontSize: 24,
            fontWeight: 700,
            color: COLORS.white,
            letterSpacing: "-0.02em",
          }}
        >
          Same transfer. Verified, compliant, auditable.
        </div>
      </div>

      {/* Two-panel layout */}
      <div
        style={{
          display: "flex",
          gap: 24,
          marginTop: 50,
          opacity: terminalOpacity,
          alignItems: "flex-start",
        }}
      >
        {/* Left panel: Code */}
        <Terminal title="kontext-agent.ts" width={520}>
          <CodeBlock
            lines={codeLines}
            startFrame={50}
            framesPerLine={20}
            showLineNumbers={true}
          />
        </Terminal>

        {/* Right panel: Results */}
        <div
          style={{
            width: 380,
            backgroundColor: COLORS.bgTerminal,
            borderRadius: 12,
            border: `1px solid ${COLORS.border}`,
            overflow: "hidden",
            boxShadow:
              "0 25px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.03)",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "12px 16px",
              backgroundColor: COLORS.bgLight,
              borderBottom: `1px solid ${COLORS.border}`,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor:
                  frame >= checkStartFrame ? COLORS.green : COLORS.textMuted,
                boxShadow:
                  frame >= checkStartFrame
                    ? `0 0 8px ${COLORS.green}`
                    : "none",
                transition: "all 0.3s",
              }}
            />
            <span
              style={{
                fontFamily: FONTS.sans,
                fontSize: 13,
                color: COLORS.textMuted,
              }}
            >
              verification result
            </span>
          </div>

          {/* Results body */}
          <div style={{ padding: "16px 20px" }}>
            <CheckmarkLine
              text="Trust Score: 0.94"
              startFrame={checkStartFrame}
              checkColor={COLORS.green}
            />
            <CheckmarkLine
              text="Compliance: APPROVED"
              startFrame={checkStartFrame + checkGap}
              checkColor={COLORS.green}
            />
            <CheckmarkLine
              text="Anomaly Check: CLEAR"
              startFrame={checkStartFrame + checkGap * 2}
              checkColor={COLORS.green}
            />
            <CheckmarkLine
              text={'Digest Chain: H_D = SHA-256(...)'}
              startFrame={checkStartFrame + checkGap * 3}
              checkColor={COLORS.green}
            />
            <CheckmarkLine
              text="Audit Trail: Tamper-evident"
              startFrame={checkStartFrame + checkGap * 4}
              checkColor={COLORS.green}
            />
          </div>
        </div>
      </div>

      {/* Digest chain visualization */}
      {frame >= chainStartFrame && (
        <div
          style={{
            marginTop: 20,
            opacity: interpolate(
              frame,
              [chainStartFrame, chainStartFrame + 15],
              [0, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            ),
          }}
        >
          <div
            style={{
              fontFamily: FONTS.sans,
              fontSize: 12,
              color: COLORS.textMuted,
              textAlign: "center",
              marginBottom: 8,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Tamper-Evident Digest Chain
          </div>
          <DigestChain startFrame={chainStartFrame + 10} />
        </div>
      )}
    </div>
  );
};
