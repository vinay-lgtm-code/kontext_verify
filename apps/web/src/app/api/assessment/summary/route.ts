import { NextResponse } from "next/server";
import AnthropicVertex from "@anthropic-ai/vertex-sdk";
import { GoogleAuth } from "google-auth-library";

interface SummaryRequest {
  scores: {
    overallScore: number;
    band: string;
    subScores: {
      intentAttribution: number;
      policyEvidence: number;
      executionLinkage: number;
      auditReplayReadiness: number;
    };
    tags: string[];
  };
  findings: {
    topGaps: string[];
    teamImpacts: {
      compliance: string;
      riskFraud: string;
      audit: string;
      platformProduct: string;
    };
    roadmap: {
      mustHave: string[];
      shouldHave: string[];
      advanced: string[];
    };
  };
  responses: Record<string, string | string[]>;
}

function buildFallback(req: SummaryRequest) {
  const flowType =
    typeof req.responses["flow_type"] === "string"
      ? req.responses["flow_type"].replace(/_/g, " ")
      : "payment";

  const bandLabel: Record<string, string> = {
    strong: "strong evidence posture",
    functional_but_exposed: "functional but exposed evidence posture",
    significant_gaps: "significant evidence gaps",
    high_risk: "high operational risk",
  };

  return {
    executiveSummary: `This ${flowType} flow scored ${req.scores.overallScore}/100, indicating ${bandLabel[req.scores.band] ?? "notable gaps"}. ${req.findings.topGaps.slice(0, 2).join(" ")}`,
    likelyFailureModes: req.findings.topGaps.slice(0, 3),
    whyThisMattersNow:
      "Regulatory expectations for payment evidence are tightening. Teams that cannot reconstruct payment decisions on demand face increasing exposure during audits, partner diligence, and incident response.",
    suggestedNextStep:
      "Start by linking screening results and execution references directly to each payment record. This addresses the highest-impact gaps with the lowest implementation effort.",
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
  const googleAuth = credentialsJson
    ? new GoogleAuth({
        credentials: JSON.parse(credentialsJson),
        scopes: "https://www.googleapis.com/auth/cloud-platform",
      })
    : undefined;

  const client = new AnthropicVertex({ projectId, region, googleAuth });

  const flowType =
    typeof body.responses["flow_type"] === "string"
      ? body.responses["flow_type"].replace(/_/g, " ")
      : "payment";

  const automationLevel =
    typeof body.responses["automation_level"] === "string"
      ? body.responses["automation_level"].replace(/_/g, " ")
      : "unknown";

  const rails = Array.isArray(body.responses["rails"])
    ? body.responses["rails"].join(", ")
    : "unknown";

  const systems = Array.isArray(body.responses["systems_touched"])
    ? body.responses["systems_touched"].join(", ")
    : "unknown";

  const teams = Array.isArray(body.responses["stakeholder_teams"])
    ? body.responses["stakeholder_teams"].join(", ")
    : "unknown";

  const painSignals = Array.isArray(body.responses["pain_last_12_months"])
    ? body.responses["pain_last_12_months"].join(", ")
    : "none";

  const prompt = `You are generating a concise operator-grade assessment summary for a payments or stablecoin infrastructure team.

Audience:
- compliance
- risk/fraud
- audit
- payments product/platform

Writing rules:
- be specific, not generic
- avoid hype
- do not mention vendors
- do not sell
- do not invent facts
- do not state legal conclusions
- write clearly and professionally
- focus on operational implications

Assessment context:
- Flow type: ${flowType}
- Automation level: ${automationLevel}
- Rails: ${rails}
- Systems involved: ${systems}
- Stakeholder teams: ${teams}

Scores:
- Overall: ${body.scores.overallScore} / 100
- Band: ${body.scores.band}
- Intent & Attribution: ${body.scores.subScores.intentAttribution}
- Policy Evidence: ${body.scores.subScores.policyEvidence}
- Execution Linkage: ${body.scores.subScores.executionLinkage}
- Audit Replay Readiness: ${body.scores.subScores.auditReplayReadiness}

Top gaps:
${body.findings.topGaps.map((g) => `- ${g}`).join("\n")}

Pain signals:
${painSignals}

Roadmap:
- Must have: ${body.findings.roadmap.mustHave.join("; ")}
- Should have: ${body.findings.roadmap.shouldHave.join("; ")}
- Advanced: ${body.findings.roadmap.advanced.join("; ")}

Return valid JSON only with this schema:
{
  "executiveSummary": "120-180 words",
  "likelyFailureModes": ["string", "string", "string"],
  "whyThisMattersNow": "60-100 words",
  "suggestedNextStep": "40-80 words"
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
