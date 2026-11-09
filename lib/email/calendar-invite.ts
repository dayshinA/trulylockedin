import "server-only";

import { SITE_NAME } from "@/lib/site";
import type { Booking } from "@/types/booking";

// A calendar invitation (iCalendar, RFC 5545) attached to booking emails.
// Gmail adds an invitation addressed to its reader straight to their Google
// Calendar (the default "Add invitations to my calendar" setting), and Apple
// Mail and Outlook show an Add button. A CANCEL with the same UID removes the
// event again. Times are UTC, so there's no time-zone block to get wrong.

export type InviteMethod = "REQUEST" | "CANCEL";

export type Invite = {
  method: InviteMethod;
  // Kept stable per booking and per calendar (salon or client), so the
  // cancellation finds the event the confirmation added.
  uid: string;
  title: string;
  description: string;
  location?: string;
  attendee: { name: string; email: string };
  // "Name <address>": the From address of our emails.
  organizer: string;
};

export function inviteFor(
  b: Booking,
  who: "client" | "salon",
  details: Omit<Invite, "uid">,
): Invite {
  const domain = addressOf(details.organizer).split("@")[1] ?? "trulylockedin";
  return { ...details, uid: `${who}-${b.id}@${domain}` };
}

export function inviteAttachment(b: Booking, invite: Invite) {
  return {
    filename: "invite.ics",
    content: Buffer.from(inviteFile(b, invite), "utf8"),
    contentType: `text/calendar; charset=utf-8; method=${invite.method}`,
  };
}

function inviteFile(b: Booking, invite: Invite): string {
  const cancel = invite.method === "CANCEL";
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${SITE_NAME}//Bookings//EN`,
    "CALSCALE:GREGORIAN",
    `METHOD:${invite.method}`,
    "BEGIN:VEVENT",
    `UID:${invite.uid}`,
    // A cancellation must outrank the invitation it replaces.
    `SEQUENCE:${cancel ? 1 : 0}`,
    `DTSTAMP:${icsTime(Date.now())}`,
    `DTSTART:${icsTime(Date.parse(b.startUtc))}`,
    `DTEND:${icsTime(Date.parse(b.endUtc))}`,
    `SUMMARY:${icsText(invite.title)}`,
    `DESCRIPTION:${icsText(invite.description)}`,
    ...(invite.location ? [`LOCATION:${icsText(invite.location)}`] : []),
    `ORGANIZER;CN=${icsParam(nameOf(invite.organizer))}:mailto:${addressOf(invite.organizer)}`,
    // Already accepted and no RSVP: the organizer address has no inbox.
    `ATTENDEE;CN=${icsParam(invite.attendee.name)};ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;RSVP=FALSE:mailto:${invite.attendee.email}`,
    `STATUS:${cancel ? "CANCELLED" : "CONFIRMED"}`,
    "TRANSP:OPAQUE",
    ...(cancel
      ? []
      : [
          "BEGIN:VALARM",
          "ACTION:DISPLAY",
          `DESCRIPTION:${icsText(invite.title)}`,
          "TRIGGER:-PT2H",
          "END:VALARM",
        ]),
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .map(fold)
    .join("\r\n")
    .concat("\r\n");
}

const addressOf = (from: string) => from.match(/<([^>]+)>/)?.[1] ?? from.trim();
const nameOf = (from: string) =>
  from.match(/^\s*"?([^"<]+?)"?\s*</)?.[1] ?? SITE_NAME;

// 20261104T091500Z
function icsTime(ms: number): string {
  return new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function icsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/[,;]/g, (c) => `\\${c}`)
    .replace(/\r?\n/g, "\\n");
}

// Parameter values can't hold these characters unquoted.
function icsParam(text: string): string {
  return `"${text.replace(/"/g, "'")}"`;
}

// Lines longer than 75 octets continue on the next line after a space.
function fold(line: string): string {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  for (const char of line) {
    const limit = parts.length === 0 ? 75 : 74;
    if (Buffer.byteLength(current + char, "utf8") > limit) {
      parts.push(current);
      current = char;
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts.join("\r\n ");
}
