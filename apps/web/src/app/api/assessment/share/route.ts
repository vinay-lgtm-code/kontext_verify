import { NextResponse } from "next/server";
import { Resend } from "resend";

interface ShareRequest {
  emails: string[];
  scores: {
    overallScore: number;
    band: string;
    subScores: {
      intentAttribution: number;
      policyEvidence: number;
      executionLinkage: number;
      auditReplayReadiness: number;
    };
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
  aiSummary: {
    executiveSummary: string;
  } | null;
}

const bandLabels: Record<string, string> = {
  strong: "Strong Evidence Posture",
  functional_but_exposed: "Functional but Exposed",
  significant_gaps: "Significant Evidence Gaps",
  high_risk: "High Operational Risk",
};

function bandHexColor(band: string): string {
  switch (band) {
    case "strong": return "#22c55e";
    case "functional_but_exposed": return "#f59e0b";
    case "significant_gaps": return "#f97316";
    case "high_risk": return "#ef4444";
    default: return "#6b7280";
  }
}

function buildEmailHtml(req: ShareRequest): string {
  const color = bandHexColor(req.scores.band);
  const label = bandLabels[req.scores.band] ?? "Assessment Complete";

  const gapsList = req.findings.topGaps
    .map((g) => `<li style="margin-bottom:8px;color:#374151;font-size:14px;line-height:1.6;">${escapeHtml(g)}</li>`)
    .join("");

  const summary = req.aiSummary?.executiveSummary
    ? escapeHtml(req.aiSummary.executiveSummary)
    : `This flow scored ${req.scores.overallScore}/100, indicating ${label.toLowerCase()}.`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">

<!-- Header -->
<tr><td style="padding:32px 32px 24px;text-align:center;border-bottom:1px solid #e5e7eb;">
  <div style="font-family:monospace;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:3px;color:${color};">${escapeHtml(label)}</div>
  <div style="margin-top:12px;font-size:64px;font-weight:700;color:${color};line-height:1;">${req.scores.overallScore}</div>
  <div style="margin-top:4px;font-size:14px;color:#9ca3af;">out of 100</div>
</td></tr>

<!-- Sub-scores -->
<tr><td style="padding:24px 32px;">
  <div style="font-family:monospace;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:2px;color:#9ca3af;margin-bottom:12px;">Sub-scores</div>
  <table width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td width="50%" style="padding:8px 8px 8px 0;vertical-align:top;">
      <div style="border:1px solid #e5e7eb;border-radius:8px;padding:12px;">
        <div style="font-size:12px;color:#6b7280;">Intent & Attribution</div>
        <div style="margin-top:4px;font-size:24px;font-weight:700;color:${subColor(req.scores.subScores.intentAttribution)};">${req.scores.subScores.intentAttribution}<span style="font-size:14px;color:#9ca3af;font-weight:400;"> / 25</span></div>
      </div>
    </td>
    <td width="50%" style="padding:8px 0 8px 8px;vertical-align:top;">
      <div style="border:1px solid #e5e7eb;border-radius:8px;padding:12px;">
        <div style="font-size:12px;color:#6b7280;">Policy Evidence</div>
        <div style="margin-top:4px;font-size:24px;font-weight:700;color:${subColor(req.scores.subScores.policyEvidence)};">${req.scores.subScores.policyEvidence}<span style="font-size:14px;color:#9ca3af;font-weight:400;"> / 25</span></div>
      </div>
    </td>
  </tr>
  <tr>
    <td width="50%" style="padding:8px 8px 8px 0;vertical-align:top;">
      <div style="border:1px solid #e5e7eb;border-radius:8px;padding:12px;">
        <div style="font-size:12px;color:#6b7280;">Execution Linkage</div>
        <div style="margin-top:4px;font-size:24px;font-weight:700;color:${subColor(req.scores.subScores.executionLinkage)};">${req.scores.subScores.executionLinkage}<span style="font-size:14px;color:#9ca3af;font-weight:400;"> / 25</span></div>
      </div>
    </td>
    <td width="50%" style="padding:8px 0 8px 8px;vertical-align:top;">
      <div style="border:1px solid #e5e7eb;border-radius:8px;padding:12px;">
        <div style="font-size:12px;color:#6b7280;">Audit Replay Readiness</div>
        <div style="margin-top:4px;font-size:24px;font-weight:700;color:${subColor(req.scores.subScores.auditReplayReadiness)};">${req.scores.subScores.auditReplayReadiness}<span style="font-size:14px;color:#9ca3af;font-weight:400;"> / 25</span></div>
      </div>
    </td>
  </tr>
  </table>
</td></tr>

<!-- Summary -->
<tr><td style="padding:0 32px 24px;">
  <div style="font-family:monospace;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:2px;color:#9ca3af;margin-bottom:8px;">Operator Summary</div>
  <p style="font-size:14px;line-height:1.65;color:#374151;margin:0;">${summary}</p>
</td></tr>

<!-- Top gaps -->
<tr><td style="padding:0 32px 24px;">
  <div style="font-family:monospace;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:2px;color:#9ca3af;margin-bottom:8px;">Top Evidence Gaps</div>
  <ul style="margin:0;padding-left:20px;">${gapsList}</ul>
</td></tr>

<!-- Footer -->
<tr><td style="padding:24px 32px;border-top:1px solid #e5e7eb;text-align:center;">
  <p style="font-size:12px;color:#9ca3af;margin:0;">This assessment was generated at <a href="https://getkontext.com" style="color:#2563eb;text-decoration:none;">getkontext.com</a></p>
  <p style="font-size:11px;color:#d1d5db;margin:8px 0 0;">Informational only. Not legal, regulatory, or compliance advice.</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

function subColor(score: number): string {
  if (score >= 20) return "#22c55e";
  if (score >= 13) return "#f59e0b";
  return "#ef4444";
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(request: Request) {
  let body: ShareRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Validate emails
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const validEmails = (body.emails ?? [])
    .filter((e): e is string => typeof e === "string" && emailRegex.test(e.trim()))
    .map((e) => e.trim())
    .slice(0, 2);

  if (validEmails.length === 0) {
    return NextResponse.json({ error: "At least one valid email required" }, { status: 400 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "Email service not configured" }, { status: 503 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const html = buildEmailHtml(body);
  const subject = `Payment Evidence Gap Assessment \u2014 Score: ${body.scores.overallScore}/100`;

  try {
    const { error } = await resend.emails.send({
      from: "Kontext <assessments@send.getlegaci.com>",
      to: validEmails,
      subject,
      html,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json({ error: "Failed to send emails" }, { status: 500 });
    }

    return NextResponse.json({ success: true, sent: validEmails.length });
  } catch (err) {
    console.error("Resend send failed:", err);
    return NextResponse.json({ error: "Failed to send emails" }, { status: 500 });
  }
}
