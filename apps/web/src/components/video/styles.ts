import React from "react";

export const COLORS = {
  bg: "#0a0a0a",
  bgLight: "#141414",
  bgTerminal: "#111111",
  border: "#2a2a2a",
  borderLight: "#3a3a3a",
  text: "#e2e8f0",
  textDim: "#64748b",
  textMuted: "#475569",
  green: "#22c55e",
  greenDim: "#16a34a",
  greenGlow: "rgba(34, 197, 94, 0.15)",
  red: "#ef4444",
  redDim: "#dc2626",
  redGlow: "rgba(239, 68, 68, 0.15)",
  blue: "#3b82f6",
  blueDim: "#2563eb",
  blueGlow: "rgba(59, 130, 246, 0.15)",
  purple: "#a78bfa",
  yellow: "#fbbf24",
  orange: "#f97316",
  cyan: "#06b6d4",
  white: "#ffffff",
  keyword: "#c084fc",    // purple for keywords
  string: "#86efac",     // green for strings
  type: "#93c5fd",       // blue for types
  comment: "#64748b",    // gray for comments
  number: "#fbbf24",     // yellow for numbers
  func: "#67e8f9",       // cyan for functions
  operator: "#e2e8f0",   // white for operators
} as const;

export const FONTS = {
  mono: "'JetBrains Mono', 'SF Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
  sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
} as const;

export const FRAME_RATE = 30;
export const TOTAL_FRAMES = 1800;

// Scene boundaries
export const SCENE_1_START = 0;
export const SCENE_1_END = 600;
export const SCENE_2_START = 600;
export const SCENE_2_END = 1350;
export const SCENE_3_START = 1350;
export const SCENE_3_END = 1560;
export const SCENE_4_START = 1560;
export const SCENE_4_END = 1800;

// Shared base styles
export const baseContainer: React.CSSProperties = {
  width: "100%",
  height: "100%",
  backgroundColor: COLORS.bg,
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  fontFamily: FONTS.sans,
  color: COLORS.text,
  overflow: "hidden",
};
