"use client";

interface TrustScoreData {
  score: number;
  level: string;
  factors: Array<{
    name: string;
    score: number;
    weight: number;
    description: string;
  }>;
}

interface ComplianceData {
  compliant: boolean;
  riskLevel: string;
  checks: Array<{
    name: string;
    passed: boolean;
    description: string;
    severity: string;
  }>;
  recommendations: string[];
}

const LEVEL_CONFIG: Record<
  string,
  { color: string; bg: string; border: string }
> = {
  verified: {
    color: "#22c55e",
    bg: "rgba(34,197,94,0.1)",
    border: "rgba(34,197,94,0.3)",
  },
  high: {
    color: "#22c55e",
    bg: "rgba(34,197,94,0.08)",
    border: "rgba(34,197,94,0.2)",
  },
  medium: {
    color: "#eab308",
    bg: "rgba(234,179,8,0.08)",
    border: "rgba(234,179,8,0.2)",
  },
  low: {
    color: "#f97316",
    bg: "rgba(249,115,22,0.08)",
    border: "rgba(249,115,22,0.2)",
  },
  untrusted: {
    color: "#ef4444",
    bg: "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.2)",
  },
};

function GaugeMeter({ score, level }: { score: number; level: string }) {
  const config = LEVEL_CONFIG[level] || LEVEL_CONFIG.medium!;
  const pct = Math.min(100, Math.max(0, score));
  // Arc from -135deg to 135deg = 270deg total
  const arcLength = 270;
  const rotation = -135 + (pct / 100) * arcLength;
  const circumference = 2 * Math.PI * 42;
  const dashLength = (pct / 100) * (arcLength / 360) * circumference;

  return (
    <div className="relative w-28 h-16 mx-auto">
      <svg viewBox="0 0 100 60" className="w-full h-full">
        {/* Background arc */}
        <path
          d="M 10 55 A 42 42 0 0 1 90 55"
          fill="none"
          stroke="#262626"
          strokeWidth="6"
          strokeLinecap="round"
        />
        {/* Colored arc */}
        <path
          d="M 10 55 A 42 42 0 0 1 90 55"
          fill="none"
          stroke={config.color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${dashLength} ${circumference}`}
          style={{
            filter: `drop-shadow(0 0 6px ${config.color}40)`,
            transition: "stroke-dasharray 0.8s ease-out",
          }}
        />
        {/* Score text */}
        <text
          x="50"
          y="48"
          textAnchor="middle"
          className="font-mono"
          fontSize="18"
          fontWeight="700"
          fill={config.color}
        >
          {score}
        </text>
        <text
          x="50"
          y="57"
          textAnchor="middle"
          fontSize="6"
          fill="#71717a"
          className="uppercase"
          letterSpacing="0.1em"
        >
          / 100
        </text>
      </svg>
    </div>
  );
}

export function TrustGauge({
  trustScore,
  compliance,
}: {
  trustScore: TrustScoreData | null;
  compliance: ComplianceData | null;
}) {
  const score = trustScore?.score ?? 50;
  const level = trustScore?.level ?? "medium";
  const config = LEVEL_CONFIG[level] || LEVEL_CONFIG.medium!;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#262626]">
        <svg
          className="w-3.5 h-3.5 text-[#a1a1aa]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#a1a1aa]">
          Trust & Compliance
        </h3>
      </div>

      <div className="flex-1 px-4 py-3 overflow-y-auto space-y-3">
        {/* Gauge */}
        <GaugeMeter score={score} level={level} />

        {/* Level badge */}
        <div className="flex justify-center">
          <span
            className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
            style={{
              color: config.color,
              background: config.bg,
              border: `1px solid ${config.border}`,
            }}
          >
            {level}
          </span>
        </div>

        {/* Trust factors */}
        {trustScore && trustScore.factors.length > 0 && (
          <div className="space-y-1.5 mt-2">
            <div className="text-[9px] text-[#71717a] uppercase tracking-wider">
              Trust Factors
            </div>
            {trustScore.factors.map((f) => (
              <div key={f.name} className="flex items-center gap-2">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[9px] text-[#a1a1aa] capitalize">
                      {f.name.replace(/_/g, " ")}
                    </span>
                    <span className="text-[9px] font-mono text-[#71717a]">
                      {f.score}
                    </span>
                  </div>
                  <div className="h-1 rounded-full bg-[#262626] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${f.score}%`,
                        background:
                          f.score >= 70
                            ? "#22c55e"
                            : f.score >= 40
                              ? "#eab308"
                              : "#ef4444",
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Compliance status */}
        {compliance && (
          <div className="mt-2 space-y-2">
            <div className="text-[9px] text-[#71717a] uppercase tracking-wider">
              Last Compliance Check
            </div>
            <div
              className="px-2.5 py-2 rounded-lg border"
              style={{
                background: compliance.compliant
                  ? "rgba(34,197,94,0.06)"
                  : "rgba(239,68,68,0.06)",
                borderColor: compliance.compliant
                  ? "rgba(34,197,94,0.2)"
                  : "rgba(239,68,68,0.2)",
              }}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                {compliance.compliant ? (
                  <svg
                    className="w-3 h-3 text-green-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-3 h-3 text-red-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                )}
                <span
                  className={`text-[10px] font-semibold ${
                    compliance.compliant ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {compliance.compliant ? "COMPLIANT" : "NON-COMPLIANT"}
                </span>
                <span
                  className="ml-auto text-[8px] font-bold uppercase px-1.5 py-0.5 rounded"
                  style={{
                    color:
                      compliance.riskLevel === "low"
                        ? "#22c55e"
                        : compliance.riskLevel === "medium"
                          ? "#eab308"
                          : "#ef4444",
                    background:
                      compliance.riskLevel === "low"
                        ? "rgba(34,197,94,0.15)"
                        : compliance.riskLevel === "medium"
                          ? "rgba(234,179,8,0.15)"
                          : "rgba(239,68,68,0.15)",
                  }}
                >
                  {compliance.riskLevel} risk
                </span>
              </div>

              {/* Check results */}
              <div className="space-y-0.5">
                {compliance.checks.slice(0, 5).map((c, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span
                      className={`text-[8px] ${
                        c.passed ? "text-green-500" : "text-red-400"
                      }`}
                    >
                      {c.passed ? "\u2713" : "\u2717"}
                    </span>
                    <span className="text-[9px] text-[#a1a1aa] truncate">
                      {c.name.replace(/_/g, " ")}
                    </span>
                  </div>
                ))}
                {compliance.checks.length > 5 && (
                  <span className="text-[8px] text-[#52525b]">
                    +{compliance.checks.length - 5} more checks
                  </span>
                )}
              </div>
            </div>

            {/* OFAC indicator */}
            {compliance.checks.some(
              (c) => c.name.includes("sanctions") && c.passed
            ) && (
              <div className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-[rgba(34,197,94,0.06)] border border-[rgba(34,197,94,0.15)]">
                <svg
                  className="w-3 h-3 text-green-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                <span className="text-[9px] text-green-400">
                  OFAC Sanctions: Clear
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
