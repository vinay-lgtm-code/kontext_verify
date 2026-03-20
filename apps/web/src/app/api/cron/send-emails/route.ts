import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import schedule from './schedule.json';

interface ScheduleEntry {
  draft_id: string;
  scheduled_time: string;
  company: string;
  to: string;
}

export async function GET(req: NextRequest) {
  // Verify cron secret (Vercel sends Authorization: Bearer <CRON_SECRET>)
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET
  );
  oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
  });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  const now = new Date();
  let sentCount = 0;
  const results: Array<{ company: string; to: string; status: string }> = [];

  for (const entry of schedule as ScheduleEntry[]) {
    const scheduledTime = new Date(entry.scheduled_time);
    if (now < scheduledTime) continue;

    try {
      // Check if draft still exists (already-sent drafts will 404)
      await gmail.users.drafts.get({ userId: 'me', id: entry.draft_id });

      // Draft exists and is due — send it
      await gmail.users.drafts.send({
        userId: 'me',
        requestBody: { id: entry.draft_id },
      });

      sentCount++;
      results.push({ company: entry.company, to: entry.to, status: 'sent' });
    } catch {
      // Draft not found = already sent or deleted. Skip silently.
      results.push({ company: entry.company, to: entry.to, status: 'already_sent' });
    }
  }

  return NextResponse.json({
    sent: sentCount,
    checked_at: now.toISOString(),
    total_scheduled: (schedule as ScheduleEntry[]).length,
    results: results.filter((r) => r.status === 'sent'),
  });
}
