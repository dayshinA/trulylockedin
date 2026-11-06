import { z } from "zod";

import { referencePhotosSchema } from "./reference-photos";
import { docIdSchema, localDateSchema, localTimeSchema } from "./schemas";

// UK numbers normalise to E.164 (+44…), which works for tel: and WhatsApp links.
// International numbers are accepted if already written with a +country code.
export function normalizePhone(input: string): string | null {
  const compact = input
    .replace(/[\s().-]/g, "")
    .replace(/^00/, "+")
    // "+44 (0)7700…" and "+44 07700…" are common ways of writing UK numbers.
    .replace(/^\+440/, "+44");
  if (/^0[1-9]\d{8,9}$/.test(compact)) return `+44${compact.slice(1)}`;
  if (compact.startsWith("+44")) {
    return /^\+44[1-9]\d{8,9}$/.test(compact) ? compact : null;
  }
  if (/^\+[1-9]\d{7,14}$/.test(compact)) return compact;
  return null;
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || undefined);

const PHONE_MESSAGE = "Enter a valid phone number, e.g. 07700 900123";
const EMAIL_MESSAGE = "Enter a valid email address";

export const phoneSchema = z
  .string()
  .trim()
  .min(1, "Enter your phone number")
  .refine((value) => normalizePhone(value) !== null, PHONE_MESSAGE)
  .transform((value) => normalizePhone(value)!);

export const optionalPhoneSchema = optionalText(30)
  .refine(
    (value) => value === undefined || normalizePhone(value) !== null,
    PHONE_MESSAGE,
  )
  .transform((value) => (value === undefined ? undefined : normalizePhone(value)!));

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Enter your email address")
  .max(200)
  .pipe(z.email(EMAIL_MESSAGE));

export const optionalEmailSchema = optionalText(200).pipe(
  z.email(EMAIL_MESSAGE).optional(),
);

const optionIdsSchema = z.array(docIdSchema).max(50).default([]);

export const slotQuerySchema = z.object({
  serviceId: docIdSchema,
  optionIds: optionIdsSchema,
  date: localDateSchema,
});

// The public booking form. Email is required (with the booking reference it
// finds the booking again on /book/find); phone is optional. `website` is a
// honeypot: hidden from people, so any value means a bot filled it in.
export const bookingRequestSchema = z.object({
  serviceId: docIdSchema,
  optionIds: optionIdsSchema,
  date: localDateSchema,
  start: localTimeSchema,
  name: z
    .string()
    .trim()
    .min(2, "Please enter your name")
    .max(80, "Name is too long"),
  phone: optionalPhoneSchema,
  email: emailSchema,
  notes: optionalText(1000),
  referencePhotos: referencePhotosSchema,
  // The "I agree to the terms" box. Required server-side too, so the stored
  // termsVersion always means the client ticked it.
  acceptTerms: z.literal(true, {
    error: "Please tick the box to agree to the terms",
  }),
  website: z.string().optional(),
});

export type BookingRequest = z.infer<typeof bookingRequestSchema>;
