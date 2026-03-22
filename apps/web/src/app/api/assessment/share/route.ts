import { NextResponse } from "next/server";
import { Resend } from "resend";

interface ShareRequest {
  emails: string[];
  scores: {
    overallScore: number;
    overallTier: string;
    subScores: {
      decisionTraceability: number;
      reviewerReadiness: number;
      operationalResilience: number;
      automationControls?: number;
    };
    persona: {
      role?: string;
      companyType?: string;
      stage?: string;
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
    nextBestAsset: {
      href: string;
      label: string;
    };
  };
}

const tierLabels: Record<string, string> = {
  at_risk: "At Risk",
  developing: "Developing",
  operationally_ready: "Operationally Ready",
  reviewer_ready: "Reviewer Ready",
};

function tierHexColor(tier: string): string {
  switch (tier) {
    case "reviewer_ready": return "#22c55e";
    case "operationally_ready": return "#3b6ef8";
    case "developing": return "#f59e0b";
    case "at_risk": return "#ef4444";
    default: return "#6b7280";
  }
}

function subColor(score: number): string {
  if (score >= 70) return "#22c55e";
  if (score >= 40) return "#f59e0b";
  return "#ef4444";
}

function buildEmailHtml(req: ShareRequest): string {
  const color = tierHexColor(req.scores.overallTier);
  const label = tierLabels[req.scores.overallTier] ?? "Assessment Complete";

  const blockersList = req.findings.likelyReviewerBlockers
    .map((b) => `<li style="margin-bottom:8px;color:#374151;font-size:14px;line-height:1.6;">${escapeHtml(b)}</li>`)
    .join("");

  const artifactsList = req.findings.missingArtifacts
    .map((a) => `<li style="margin-bottom:6px;color:#374151;font-size:14px;line-height:1.6;">${escapeHtml(a)}</li>`)
    .join("");

  const days30 = req.findings.remediationPlan.days30
    .map((r) => `<li style="margin-bottom:6px;color:#374151;font-size:13px;line-height:1.6;">${escapeHtml(r)}</li>`)
    .join("");
  const days60 = req.findings.remediationPlan.days60
    .map((r) => `<li style="margin-bottom:6px;color:#374151;font-size:13px;line-height:1.6;">${escapeHtml(r)}</li>`)
    .join("");
  const days90 = req.findings.remediationPlan.days90
    .map((r) => `<li style="margin-bottom:6px;color:#374151;font-size:13px;line-height:1.6;">${escapeHtml(r)}</li>`)
    .join("");

  const subScores = [
    { label: "Decision Traceability", value: req.scores.subScores.decisionTraceability },
    { label: "Reviewer Readiness", value: req.scores.subScores.reviewerReadiness },
    { label: "Operational Resilience", value: req.scores.subScores.operationalResilience },
  ];
  if (req.scores.subScores.automationControls !== undefined) {
    subScores.push({ label: "Automation Controls", value: req.scores.subScores.automationControls });
  }

  const subScoreRows = subScores.map((s) =>
    `<td width="${Math.floor(100 / subScores.length)}%" style="padding:8px;vertical-align:top;">
      <div style="border:1px solid #e5e7eb;border-radius:8px;padding:12px;">
        <div style="font-size:11px;color:#6b7280;">${s.label}</div>
        <div style="margin-top:4px;font-size:22px;font-weight:700;color:${subColor(s.value)};">${s.value}<span style="font-size:13px;color:#9ca3af;font-weight:400;">/100</span></div>
      </div>
    </td>`
  ).join("");

  const nextAssetUrl = `https://getkontext.com${req.findings.nextBestAsset.href}`;

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
  <div style="margin-top:12px;font-size:56px;font-weight:700;color:${color};line-height:1;">${req.scores.overallScore}</div>
  <div style="margin-top:4px;font-size:14px;color:#9ca3af;">out of 100</div>
</td></tr>

<!-- Summary -->
<tr><td style="padding:24px 32px;">
  <p style="font-size:14px;line-height:1.65;color:#374151;margin:0;">${escapeHtml(req.findings.bluntSummary)}</p>
</td></tr>

<!-- Sub-scores -->
<tr><td style="padding:0 24px 24px;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr>${subScoreRows}</tr></table>
</td></tr>

<!-- Reviewer blockers -->
<tr><td style="padding:0 32px 24px;">
  <div style="font-family:monospace;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:2px;color:#ef4444;margin-bottom:8px;">Likely Reviewer Blockers</div>
  <ul style="margin:0;padding-left:20px;">${blockersList}</ul>
</td></tr>

<!-- Missing artifacts -->
${artifactsList ? `<tr><td style="padding:0 32px 24px;">
  <div style="font-family:monospace;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:2px;color:#9ca3af;margin-bottom:8px;">Missing Artifacts</div>
  <ul style="margin:0;padding-left:20px;">${artifactsList}</ul>
</td></tr>` : ""}

<!-- Remediation plan -->
<tr><td style="padding:0 32px 24px;">
  <div style="font-family:monospace;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:2px;color:#9ca3af;margin-bottom:12px;">30/60/90-Day Remediation Plan</div>
  <div style="margin-bottom:12px;">
    <div style="font-size:11px;font-weight:600;text-transform:uppercase;color:#ef4444;margin-bottom:4px;">First 30 days</div>
    <ul style="margin:0;padding-left:20px;">${days30}</ul>
  </div>
  <div style="margin-bottom:12px;">
    <div style="font-size:11px;font-weight:600;text-transform:uppercase;color:#f59e0b;margin-bottom:4px;">60 days</div>
    <ul style="margin:0;padding-left:20px;">${days60}</ul>
  </div>
  <div>
    <div style="font-size:11px;font-weight:600;text-transform:uppercase;color:#3b6ef8;margin-bottom:4px;">90 days</div>
    <ul style="margin:0;padding-left:20px;">${days90}</ul>
  </div>
</td></tr>

<!-- Next step -->
<tr><td style="padding:0 32px 24px;text-align:center;">
  <a href="${nextAssetUrl}" style="display:inline-block;padding:12px 24px;background-color:#3b6ef8;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">${escapeHtml(req.findings.nextBestAsset.label)}</a>
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
  const tierLabel = tierLabels[body.scores.overallTier] ?? "Assessment Complete";
  const subject = `Payment Review Readiness \u2014 ${tierLabel} (${body.scores.overallScore}/100)`;

  try {
    const { error } = await resend.emails.send({
      from: "Kontext <assessments@send.getkontext.com>",
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
