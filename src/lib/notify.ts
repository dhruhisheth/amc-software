/**
 * Delivery of reminders, over whichever channels are configured.
 *
 * Both channels are optional and are called through their providers' REST APIs directly, so the
 * app takes no extra dependency. When a channel has no credentials it is reported as
 * unconfigured rather than failing — reminders are still raised and visible in the app, they
 * just aren't delivered anywhere until keys are set:
 *
 *   Email (Resend):  RESEND_API_KEY, REMINDER_FROM_EMAIL
 *   SMS   (Twilio):  TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
 */

export interface DeliveryResult {
  channel: string;
  ok: boolean;
  error?: string;
}

function isConfigured(...values: Array<string | undefined>): boolean {
  return values.every((v) => typeof v === "string" && v.trim().length > 0);
}

export function emailConfigured(): boolean {
  return isConfigured(process.env.RESEND_API_KEY, process.env.REMINDER_FROM_EMAIL);
}

export function smsConfigured(): boolean {
  return isConfigured(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN,
    process.env.TWILIO_FROM_NUMBER
  );
}

async function sendEmail(to: string, subject: string, body: string): Promise<DeliveryResult> {
  if (!emailConfigured()) {
    return { channel: "email", ok: false, error: "Email is not configured (RESEND_API_KEY)." };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.REMINDER_FROM_EMAIL,
        to: [to],
        subject,
        text: body,
      }),
    });

    if (!response.ok) {
      return { channel: "email", ok: false, error: `Resend returned ${response.status}.` };
    }
    return { channel: "email", ok: true };
  } catch (err) {
    return {
      channel: "email",
      ok: false,
      error: err instanceof Error ? err.message : "Email send failed.",
    };
  }
}

async function sendSms(to: string, body: string): Promise<DeliveryResult> {
  if (!smsConfigured()) {
    return { channel: "sms", ok: false, error: "SMS is not configured (TWILIO_ACCOUNT_SID)." };
  }

  const sid = process.env.TWILIO_ACCOUNT_SID as string;
  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: to,
          From: process.env.TWILIO_FROM_NUMBER as string,
          Body: body,
        }),
      }
    );

    if (!response.ok) {
      return { channel: "sms", ok: false, error: `Twilio returned ${response.status}.` };
    }
    return { channel: "sms", ok: true };
  } catch (err) {
    return {
      channel: "sms",
      ok: false,
      error: err instanceof Error ? err.message : "SMS send failed.",
    };
  }
}

/**
 * Deliver one reminder to every configured channel. Succeeds if any channel accepted it, so a
 * missing email provider doesn't suppress a working SMS.
 */
export async function deliver(
  recipients: { email: string; phone: string },
  subject: string,
  body: string
): Promise<{ ok: boolean; channels: string[]; errors: string[] }> {
  const results: DeliveryResult[] = [];

  if (recipients.email.trim()) results.push(await sendEmail(recipients.email.trim(), subject, body));
  if (recipients.phone.trim()) results.push(await sendSms(recipients.phone.trim(), body));

  if (results.length === 0) {
    return { ok: false, channels: [], errors: ["No reminder email or phone number is set."] };
  }

  return {
    ok: results.some((r) => r.ok),
    channels: results.filter((r) => r.ok).map((r) => r.channel),
    errors: results.filter((r) => !r.ok).map((r) => `${r.channel}: ${r.error}`),
  };
}
