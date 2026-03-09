"use client";

interface StageEvent {
  stage: string;
  status: string;
  code: string;
  message: string;
  timestamp: string;
}

interface Attempt {
  attemptId: string;
  archetype: string;
  chain: string;
  settlementAsset: string;
  finalState: string;
  senderRefs: Record<string, unknown>;
  recipientRefs: Record<string, unknown>;
  stageEvents: StageEvent[];
  createdAt: string;
  updatedAt: string;
}

function stateColor(state: string): string {
  switch (state) {
    case "succeeded":
      return "text-[#4ade80]";
    case "failed":
      return "text-[#f87171]";
    case "blocked":
      return "text-[#f87171]";
    case "review":
      return "text-[#fbbf24]";
    case "refunded":
      return "text-[#60a5fa]";
    default:
      return "text-[#a1a1aa]";
  }
}

function stateLED(state: string): string {
  switch (state) {
    case "succeeded":
      return "bg-[#4ade80] shadow-[0_0_6px_rgba(74,222,128,0.5)]";
    case "failed":
    case "blocked":
      return "bg-[#f87171] shadow-[0_0_6px_rgba(248,113,113,0.5)]";
    case "review":
      return "bg-[#fbbf24] shadow-[0_0_6px_rgba(251,191,36,0.5)]";
    default:
      return "bg-[#71717a]";
  }
}

function shortAddr(refs: Record<string, unknown>): string {
  const addr = refs["address"] as string | undefined;
  if (!addr) return "—";
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function currentStage(events: StageEvent[]): string {
  if (events.length === 0) return "intent";
  return events[events.length - 1]!.stage;
}

export function AttemptRow({ attempt }: { attempt: Attempt }) {
  return (
    <div className="border border-[#27272a] bg-[#18181b] px-4 py-3 hover:border-[#3f3f46] transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${stateLED(attempt.finalState)}`} />
          <code className="text-xs text-[#fafafa]">{attempt.attemptId}</code>
          <span className={`text-xs font-bold uppercase ${stateColor(attempt.finalState)}`}>
            {attempt.finalState}
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-[#71717a]">
          <span>{attempt.archetype}</span>
          <span>{attempt.chain}</span>
          <span>{attempt.settlementAsset}</span>
          <span>{attempt.createdAt.slice(0, 19)}</span>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-4 text-xs text-[#a1a1aa]">
        <span>{shortAddr(attempt.senderRefs)} → {shortAddr(attempt.recipientRefs)}</span>
        <span className="text-[#71717a]">stage: {currentStage(attempt.stageEvents)}</span>
        <span className="text-[#71717a]">{attempt.stageEvents.length} events</span>
      </div>

      {/* Show last failure/review reason */}
      {(attempt.finalState === "failed" || attempt.finalState === "blocked" || attempt.finalState === "review") && (
        <div className="mt-2 text-xs">
          {attempt.stageEvents
            .filter((e) => e.status === "failed" || e.status === "review")
            .slice(-1)
            .map((e, i) => (
              <div key={i} className={`${e.status === "failed" ? "text-[#f87171]" : "text-[#fbbf24]"}`}>
                {e.code} — {e.message}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

export type { Attempt, StageEvent };
