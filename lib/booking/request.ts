import { z } from "zod";

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

export const slotQuerySchema = z.object({
  serviceId: docIdSchema,
  date: localDateSchema,
});

// The public booking form. `website` is a honeypot: hidden from people, so any
// value means a bot filled it in.
export const bookingRequestSchema = z.object({
  serviceId: docIdSchema,
  date: localDateSchema,
  start: localTimeSchema,
  name: z
    .string()
    .trim()
    .min(2, "Please enter your name")
    .max(80, "Name is too long"),
  phone: z
    .string()
    .trim()
    .refine(
      (value) => normalizePhone(value) !== null,
      "Enter a valid phone number, e.g. 07700 900123",
    )
    .transform((value) => normalizePhone(value)!),
  email: optionalText(200).pipe(
    z.email("Enter a valid email address").optional(),
  ),
  notes: optionalText(1000),
  website: z.string().optional(),
});

export type BookingRequest = z.infer<typeof bookingRequestSchema>;
