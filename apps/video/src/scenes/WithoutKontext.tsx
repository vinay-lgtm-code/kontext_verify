import React from "react";
import { useCurrentFrame, interpolate, spring, Sequence } from "remotion";
import { Terminal } from "../components/Terminal";
import { CodeBlock, t } from "../components/CodeBlock";
import { COLORS, FONTS, FRAME_RATE, baseContainer } from "../styles";

export const WithoutKontext: React.FC = () => {
  const frame = useCurrentFrame();

  // Scene title fade
  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });
  const titleY = interpolate(frame, [0, 20], [15, 0], {
    extrapolateRight: "clamp",
  });

  // "Without Kontext" label
  const labelOpacity = interpolate(frame, [10, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Terminal appearance
  const terminalOpacity = interpolate(frame, [30, 50], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const terminalY = interpolate(frame, [30, 50], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Code lines for the agent transfer
  const transferCode = [
    [
      t("> ", COLORS.textMuted),
      t("agent", COLORS.text),
      t(".", COLORS.operator),
      t("transfer", COLORS.func),
      t("({ ", COLORS.operator),
    ],
    [
      t("    to", COLORS.text),
      t(": ", COLORS.operator),
      t('"0x7a2F..."', COLORS.string),
      t(",", COLORS.operator),
    ],
    [
      t("    amount", COLORS.text),
      t(": ", COLORS.operator),
      t('"50000"', COLORS.string),
      t(",", COLORS.operator),
    ],
    [
      t("    currency", COLORS.text),
      t(": ", COLORS.operator),
      t('"USDC"', COLORS.string),
    ],
    [
      t("  })", COLORS.operator),
    ],
  ];

  // "Transfer complete" checkmark
  const transferDoneFrame = 200;
  const transferDoneOpacity = interpolate(
    frame,
    [transferDoneFrame, transferDoneFrame + 10],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Audit trail section
  const auditStartFrame = 240;
  const auditCode = [
    [
      t("[", COLORS.textMuted),
      t("INFO", COLORS.yellow),
      t("] ", COLORS.textMuted),
      t("Transfer sent: ", COLORS.text),
      t("$50,000", COLORS.number),
      t(" to ", COLORS.text),
      t("0x7a2F...", COLORS.string),
    ],
  ];

  // Red warning text
  const warningFrame = 340;
  const warningOpacity = interpolate(
    frame,
    [warningFrame, warningFrame + 20],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // "6 months later" text
  const laterFrame = 420;
  const laterOpacity = interpolate(
    frame,
    [laterFrame, laterFrame + 20],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const laterY = interpolate(
    frame,
    [laterFrame, laterFrame + 20],
    [10, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Blinking cursor with no response
  const cursorFrame = 500;
  const cursorElapsed = Math.max(0, frame - cursorFrame);
  const cursorVisible = frame >= cursorFrame && Math.floor(cursorElapsed / 15) % 2 === 0;

  // Fade out at end
  const fadeOut = interpolate(frame, [570, 600], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div style={{ ...baseContainer, opacity: fadeOut }}>
      {/* Scene label */}
      <div
        style={{
          position: "absolute",
          top: 40,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div
          style={{
            opacity: labelOpacity,
            fontFamily: FONTS.sans,
            fontSize: 14,
            fontWeight: 500,
            color: COLORS.red,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}
        >
          Without Kontext
        </div>
        <div
          style={{
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
            fontFamily: FONTS.sans,
            fontSize: 28,
            fontWeight: 700,
            color: COLORS.white,
            letterSpacing: "-0.02em",
          }}
        >
          What happens when your AI agent moves $50,000?
        </div>
      </div>

      {/* Main terminal */}
      <div
        style={{
          opacity: terminalOpacity,
          transform: `translateY(${terminalY}px)`,
          marginTop: 40,
        }}
      >
        <Terminal title="agent-runtime.ts" width={820}>
          {/* Transfer code */}
          <CodeBlock
            lines={transferCode}
            startFrame={60}
            framesPerLine={22}
            showLineNumbers={false}
          />

          {/* Transfer complete */}
          {frame >= transferDoneFrame && (
            <div
              style={{
                opacity: transferDoneOpacity,
                marginTop: 8,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ color: COLORS.green, fontWeight: 700 }}>✓</span>
              <span style={{ color: COLORS.textDim }}>Transfer complete.</span>
            </div>
          )}

          {/* Audit trail log */}
          {frame >= auditStartFrame && (
            <div style={{ marginTop: 16, borderTop: `1px solid ${COLORS.border}`, paddingTop: 12 }}>
              <div style={{ color: COLORS.textMuted, fontSize: 12, marginBottom: 8 }}>
                Audit trail:
              </div>
              <CodeBlock
                lines={auditCode}
                startFrame={auditStartFrame + 10}
                framesPerLine={25}
                showLineNumbers={false}
              />
            </div>
          )}

          {/* Red warning */}
          {frame >= warningFrame && (
            <div
              style={{
                opacity: warningOpacity,
                marginTop: 16,
                padding: "10px 14px",
                backgroundColor: COLORS.redGlow,
                borderRadius: 6,
                border: `1px solid ${COLORS.red}33`,
              }}
            >
              <span style={{ color: COLORS.red, fontFamily: FONTS.mono, fontSize: 14 }}>
                No verification. No audit trail. No compliance.
              </span>
            </div>
          )}

          {/* 6 months later */}
          {frame >= laterFrame && (
            <div
              style={{
                opacity: laterOpacity,
                transform: `translateY(${laterY}px)`,
                marginTop: 20,
              }}
            >
              <div
                style={{
                  color: COLORS.yellow,
                  fontFamily: FONTS.sans,
                  fontSize: 15,
                  fontStyle: "italic",
                  marginBottom: 10,
                }}
              >
                6 months later, the auditor asks: "Show me the proof."
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ color: COLORS.textMuted }}>{">"}</span>
                {cursorVisible && (
                  <span
                    style={{
                      color: COLORS.text,
                      fontFamily: FONTS.mono,
                      animation: "none",
                    }}
                  >
                    █
                  </span>
                )}
              </div>
            </div>
          )}
        </Terminal>
      </div>
    </div>
  );
};
