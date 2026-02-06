import React from "react";
import { COLORS, FONTS } from "../styles";

interface TerminalProps {
  children: React.ReactNode;
  title?: string;
  width?: number | string;
  style?: React.CSSProperties;
}

export const Terminal: React.FC<TerminalProps> = ({
  children,
  title = "terminal",
  width = 900,
  style,
}) => {
  return (
    <div
      style={{
        width,
        backgroundColor: COLORS.bgTerminal,
        borderRadius: 12,
        border: `1px solid ${COLORS.border}`,
        overflow: "hidden",
        boxShadow: "0 25px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.03)",
        ...style,
      }}
    >
      {/* Title bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "12px 16px",
          backgroundColor: COLORS.bgLight,
          borderBottom: `1px solid ${COLORS.border}`,
          gap: 8,
        }}
      >
        {/* Traffic light dots */}
        <div style={{ display: "flex", gap: 7 }}>
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              backgroundColor: "#ff5f56",
            }}
          />
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              backgroundColor: "#ffbd2e",
            }}
          />
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              backgroundColor: "#27c93f",
            }}
          />
        </div>
        <span
          style={{
            fontFamily: FONTS.sans,
            fontSize: 13,
            color: COLORS.textMuted,
            marginLeft: 8,
            letterSpacing: "0.02em",
          }}
        >
          {title}
        </span>
      </div>
      {/* Terminal body */}
      <div
        style={{
          padding: "20px 24px",
          fontFamily: FONTS.mono,
          fontSize: 15,
          lineHeight: 1.7,
          color: COLORS.text,
          minHeight: 120,
        }}
      >
        {children}
      </div>
    </div>
  );
};
