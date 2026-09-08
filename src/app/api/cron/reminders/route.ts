import { NextResponse } from "next/server";
import { runReminders } from "@/lib/reminders";

// Reminders read and write the database on every call, so this must never be cached.
export const dynamic = "force-dynamic";

/**
 * The daily reminder run, triggered by the Vercel cron entry in vercel.json.
 *
 * Vercel signs its cron requests with CRON_SECRET. The endpoint refuses anything without it
 * whenever the secret is set — without that check this route would be an open trigger for
 * anyone who found the URL.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const authorization = request.headers.get("authorization");
    if (authorization !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
  }

  const result = await runReminders();
  return NextResponse.json({ ok: true, ...result });
}
