import { NextResponse } from "next/server";
import { writeFileSync, existsSync } from "fs";
import AnthropicVertex from "@anthropic-ai/vertex-sdk";

interface SummaryRequest {
  scores: {
    overallScore: number;
    overallTier: string;
    subScores: {
      decisionTraceability: number;
      reviewerReadiness: number;
      operationalResilience: number;
      automationControls?: number;
    };
    blockerTags: string[];
    artifactGapTags: string[];
    persona: {
      role?: string;
      companyType?: string;
      stage?: string;
      depth?: string;
    };
  };
  findings: {
    bluntSummary: string;
    likelyReviewerBlockers: string[];
    missingArtifacts: string[];
    remediationPlan: {
      days30: string[];
      days60: string[];
      days90: string[];
    };
  };
  responses: Record<string, string | string[]>;
}

function buildFallback(req: SummaryRequest) {
  return {
    bluntSummary: req.findings.bluntSummary,
    narrativeExplanation: "",
  };
}

export async function POST(request: Request) {
  let body: SummaryRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const projectId = process.env.ANTHROPIC_VERTEX_PROJECT_ID;
  const region = process.env.CLOUD_ML_REGION;

  if (!projectId || !region) {
    return NextResponse.json(buildFallback(body));
  }

  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (credentialsJson && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const tmpPath = "/tmp/gcp-sa-key.json";
    if (!existsSync(tmpPath)) {
      writeFileSync(tmpPath, credentialsJson, { mode: 0o600 });
    }
    process.env.GOOGLE_APPLICATION_CREDENTIALS = tmpPath;
  }

  const client = new AnthropicVertex({ projectId, region });

  const role = body.scores.persona.role?.replace(/_/g, " ") ?? "unknown";
  const companyType = body.scores.persona.companyType?.replace(/_/g, " ") ?? "unknown";
  const stage = body.scores.persona.stage?.replace(/_/g, " ") ?? "unknown";

  const initiationSources = Array.isArray(body.responses["initiation_sources"])
    ? body.responses["initiation_sources"].join(", ")
    : "unknown";

  const rails = Array.isArray(body.responses["rails"])
    ? body.responses["rails"].join(", ")
    : "unknown";

  const prompt = `You are generating a concise, realistic assessment narrative for a payments infrastructure team.

Audience: ${role} at a ${companyType} company (${stage} stage).

Writing rules:
- be specific, not generic
- avoid hype
- do not mention vendors or products
- do not sell
- do not invent facts beyond what the scores and findings show
- do not state legal conclusions
- write clearly and professionally
- focus on operational implications and what reviewers would actually notice

Assessment context:
- Company type: ${companyType}
- Stage: ${stage}
- Rails: ${rails}
- Initiation sources: ${initiationSources}
- Role: ${role}

Scores:
- Overall: ${body.scores.overallScore}/100 (tier: ${body.scores.overallTier})
- Decision Traceability: ${body.scores.subScores.decisionTraceability}/100
- Reviewer Readiness: ${body.scores.subScores.reviewerReadiness}/100
- Operational Resilience: ${body.scores.subScores.operationalResilience}/100
${body.scores.subScores.automationControls !== undefined ? `- Automation Controls: ${body.scores.subScores.automationControls}/100` : ""}

Deterministic summary (already generated):
${body.findings.bluntSummary}

Reviewer blockers:
${body.findings.likelyReviewerBlockers.map((b) => `- ${b}`).join("\n")}

Missing artifacts:
${body.findings.missingArtifacts.map((a) => `- ${a}`).join("\n")}

Remediation plan:
- 30 days: ${body.findings.remediationPlan.days30.join("; ")}
- 60 days: ${body.findings.remediationPlan.days60.join("; ")}
- 90 days: ${body.findings.remediationPlan.days90.join("; ")}

Return valid JSON only with this schema:
{
  "bluntSummary": "1-2 sentences. Restate or improve the deterministic summary above, keeping it blunt and specific.",
  "narrativeExplanation": "80-120 words. Explain what a real reviewer would notice, what questions they would ask, and what the practical risk is. Do not repeat the blunt summary."
}`;

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    const text = textBlock?.type === "text" ? textBlock.text : "";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(buildFallback(body));
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json(buildFallback(body));
  }
}
