import {
  createHash,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "node:crypto";

// No 0/O, 1/I/L, so refs can be read out over the phone.
const REF_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const REF_LENGTH = 8;

function randomCode(): string {
  let code = "";
  for (let i = 0; i < REF_LENGTH; i++) {
    code += REF_ALPHABET[randomInt(REF_ALPHABET.length)];
  }
  return code;
}

// Short, human-friendly booking reference, e.g. "TLI-7KQ2M9XA". It identifies a
// booking but grants nothing: managing a booking needs the cancel token too.
// 31^8 ≈ 8.5e11 values, so collisions are negligible at salon volumes.
export function createBookingRef(): string {
  return `TLI-${randomCode()}`;
}

export const BOOKING_REF_RE = new RegExp(
  `^TLI-[${REF_ALPHABET}]{${REF_LENGTH}}$`,
);

// Shop orders use the same scheme with their own prefix.
export function createOrderRef(): string {
  return `TLO-${randomCode()}`;
}

export const ORDER_REF_RE = new RegExp(
  `^TLO-[${REF_ALPHABET}]{${REF_LENGTH}}$`,
);

// Sent to the client once (in their manage/cancel link); only the hash is stored.
export function createCancelToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function tokenMatches(token: string, storedHash: string): boolean {
  const a = Buffer.from(hashToken(token), "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

// What a client types as a reference: "tli-7kq2 abcd", "TLI7KQ2ABCD" or just
// "7KQ2ABCD" all become "TLI-7KQ2ABCD" (prefix "TLI" or "TLO").
export function normalizeRef(input: string, prefix: "TLI" | "TLO"): string {
  const compact = input.toUpperCase().replace(/[\s-]/g, "");
  const code = compact.startsWith(prefix) ? compact.slice(prefix.length) : compact;
  return `${prefix}-${code}`;
}

// Emails as typed at checkout vs a lookup: trimmed, case-insensitive.
export function sameEmail(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}
