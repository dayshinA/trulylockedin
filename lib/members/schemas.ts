import { z } from "zod";

import { normalizePhone } from "@/lib/booking/request";

export const memberNameSchema = z
  .string()
  .trim()
  .min(2, "Please enter your name")
  .max(80, "Name is too long");

// Firebase's own minimum is 6; ask for a little more.
export const MIN_PASSWORD_LENGTH = 8;

// Stored members/{uid} documents. Parsing fails loudly on corrupt data.
export const memberDocSchema = z.object({
  name: z.string().min(1).max(80),
  email: z.string().min(1).max(200),
  phone: z.string().max(20).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// The member's own details form. An empty phone clears the saved number.
export const profileFormSchema = z.object({
  name: memberNameSchema,
  phone: z
    .string()
    .trim()
    .max(40)
    .refine(
      (value) => value === "" || normalizePhone(value) !== null,
      "Enter a valid phone number, e.g. 07700 900123",
    )
    .transform((value) => (value ? normalizePhone(value)! : undefined)),
});

export type ProfileForm = z.infer<typeof profileFormSchema>;

// Firebase Auth uids (also the members/{uid} document id). Guards URL params
// before they become Firestore paths.
export const memberUidSchema = z.string().regex(/^[A-Za-z0-9]{1,128}$/);
