import "server-only";

import type { ReactElement } from "react";
import { render, toPlainText } from "react-email";
import { Resend } from "resend";

// Transactional email through Resend. Everything here is best effort: a
// failed email is logged and never fails the booking or order that caused it.

export type EmailConfig = {
  apiKey: string;
  // "Name <address>". Until a domain is verified in Resend this is
  // onboarding@resend.dev, which can only deliver to the Resend account's own
  // email (the owner), so customer emails stay off.
  from: string;
  ownerTo?: string;
  customerEmails: boolean;
  // Absolute links in emails.
  siteUrl: string;
};

let warned = false;

export function emailConfig(): EmailConfig | null {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    if (!warned) {
      console.warn("Emails are off: RESEND_API_KEY or EMAIL_FROM is not set");
      warned = true;
    }
    return null;
  }
  return {
    apiKey,
    from,
    ownerTo: process.env.OWNER_NOTIFY_EMAIL || undefined,
    customerEmails: process.env.CUSTOMER_EMAILS_ENABLED === "true",
    siteUrl: (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(
      /\/+$/,
      "",
    ),
  };
}

let client: Resend | null = null;
const resend = (apiKey: string) => (client ??= new Resend(apiKey));

export async function sendEmail(
  config: EmailConfig,
  message: {
    to: string;
    subject: string;
    react: ReactElement;
    replyTo?: string;
    attachments?: { filename: string; content: Buffer; contentType: string }[];
  },
): Promise<void> {
  try {
    const html = await render(message.react);
    const { error } = await resend(config.apiKey).emails.send({
      from: config.from,
      to: message.to,
      subject: message.subject,
      html,
      text: toPlainText(html),
      replyTo: message.replyTo,
      attachments: message.attachments,
    });
    if (error) console.error("Email not sent:", message.subject, error);
  } catch (error) {
    console.error("Email failed:", message.subject, error);
  }
}
