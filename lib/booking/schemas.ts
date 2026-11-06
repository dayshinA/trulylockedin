import { z } from "zod";

import { mediaPublicIdSchema } from "@/lib/media/folder";
import { WEEKDAYS } from "@/types/booking";
import { parseLocalDate, parseLocalTime } from "./time";

// Used to parse stored documents (fail loudly on bad data) and, later, to
// validate admin form input before it is written.

export const localDateSchema = z
  .string()
  .refine((value) => parseLocalDate(value) !== null, "Expected yyyy-mm-dd");

export const localTimeSchema = z
  .string()
  .refine((value) => parseLocalTime(value) !== null, "Expected HH:mm");

const minutes = (time: string) => parseLocalTime(time)!;
// A closing time earlier than the opening means the next morning.
const isOvernight = (w: { start: string; end: string }) =>
  minutes(w.end) < minutes(w.start);

export const timeWindowSchema = z
  .object({
    start: localTimeSchema.refine((t) => t !== "24:00", "Expected HH:mm"),
    end: localTimeSchema,
  })
  .refine(
    (w) => minutes(w.start) !== minutes(w.end),
    "Closing time can't be the same as opening time",
  );

// A day's windows, in order and not overlapping (touching is fine). Only the
// last may close after midnight, and not after the day's first opening time.
export const windowsSchema = z
  .array(timeWindowSchema)
  .max(4)
  .refine(
    (windows) => windows.slice(0, -1).every((w) => !isOvernight(w)),
    "Only the last time range can close after midnight",
  )
  .refine(
    (windows) =>
      windows.every(
        (w, i) =>
          i === 0 || minutes(windows[i - 1].end) <= minutes(w.start),
      ),
    "Opening times must be in order and must not overlap",
  )
  .refine((windows) => {
    const last = windows.at(-1);
    return !last || !isOvernight(last) || minutes(last.end) <= minutes(windows[0].start);
  }, "Closing time runs into the next opening");

export const stepMinSchema = z.number().int().min(5).max(240);
export const chairsSchema = z.number().int().min(1).max(4);

export const dayRulesSchema = z.object({
  stepMin: stepMinSchema.optional(),
  chairs: chairsSchema.optional(),
});

export const weeklyHoursSchema = z.object(
  Object.fromEntries(
    WEEKDAYS.map((day) => [day, windowsSchema.default([])]),
  ) as Record<(typeof WEEKDAYS)[number], z.ZodDefault<typeof windowsSchema>>,
);

export const weeklyRulesSchema = z.partialRecord(z.enum(WEEKDAYS), dayRulesSchema);

export const dateOverrideSchema = z.object({
  date: localDateSchema,
  closed: z.boolean().optional(),
  windows: windowsSchema.optional(),
  blockedSlots: z.array(localTimeSchema).max(96).optional(),
  extraSlots: z.array(localTimeSchema).max(96).optional(),
  ...dayRulesSchema.shape,
});

export const bookingSettingsSchema = z.object({
  timezone: z.string().min(1),
  slotIntervalMin: stepMinSchema,
  chairs: chairsSchema,
  staggerMin: z.number().int().min(0).max(240),
  bufferMin: z.number().int().min(0).max(240),
  minNoticeHours: z
    .number()
    .min(0)
    .max(24 * 60),
  maxAdvanceDays: z.number().int().min(0).max(730),
  depositPence: z.number().int().min(0).max(100_000),
  premiumFrom: localTimeSchema
    .refine((t) => t !== "24:00", "Expected HH:mm")
    .nullable(),
});

export const bookingStatusSchema = z.enum([
  "awaiting_deposit",
  "confirmed",
  "cancelled",
  "completed",
  "no_show",
]);

export const bookedTimeSchema = z.object({
  startUtc: z.iso.datetime(),
  endUtc: z.iso.datetime(),
  status: bookingStatusSchema,
  holdExpiresAt: z.iso.datetime().optional(),
});

// Firestore document ids we generate or accept from clients: no slashes or dots.
export const docIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,100}$/);

export const serviceCategorySchema = z.object({
  id: docIdSchema,
  name: z.string().min(1),
  order: z.number().default(0),
  visibleOnline: z.boolean(),
});

export const serviceOptionSchema = z.object({
  id: docIdSchema,
  name: z.string().min(1),
  pricePence: z.number().int().min(0),
  durationMin: z.number().int().positive().nullable(),
});

export const serviceSchema = z.object({
  id: docIdSchema,
  categoryId: docIdSchema,
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().default(""),
  priceFromPence: z.number().int().min(0),
  premiumPricePence: z.number().int().min(0).optional(),
  priceLabel: z.string().optional(),
  durationMin: z.number().int().positive().nullable(),
  depositNote: z.string().optional(),
  depositRequired: z.boolean().default(true),
  imagePublicId: mediaPublicIdSchema.optional(),
  active: z.boolean(),
  onlineBooking: z.boolean(),
  optionsSelectionMode: z.enum(["single", "multiple"]),
  optionsRequired: z.boolean(),
  options: z
    .array(serviceOptionSchema)
    .max(50)
    .refine(
      (options) => new Set(options.map((o) => o.id)).size === options.length,
      "Option ids must be unique within a service",
    ),
  order: z.number().default(0),
});

export const bookingSchema = z.object({
  id: z.string().min(1),
  ref: z.string().min(1),
  service: z.object({
    id: z.string(),
    name: z.string(),
    durationMin: z.number().int().positive(),
    priceFromPence: z.number().int().min(0),
    options: z.array(serviceOptionSchema).optional(),
    premium: z.literal(true).optional(),
  }),
  date: localDateSchema,
  start: localTimeSchema,
  end: localTimeSchema,
  startUtc: z.iso.datetime(),
  endUtc: z.iso.datetime(),
  client: z.object({
    name: z.string(),
    phone: z.string().optional(),
    email: z.string().optional(),
    notes: z.string().optional(),
  }),
  status: bookingStatusSchema,
  cancelTokenHash: z.string(),
  source: z.enum(["online", "admin"]).optional(),
  memberId: z.string().optional(),
  referencePhotos: z.array(z.string()).optional(),
  termsVersion: z.string().optional(),
  deposit: z
    .object({
      amountPence: z.number().int().min(0),
      status: z.enum(["awaiting", "paid", "refunded", "refund_failed"]),
      checkoutSessionId: z.string().optional(),
      paymentIntentId: z.string().optional(),
      paidAt: z.iso.datetime().optional(),
      refundId: z.string().optional(),
      refundedAt: z.iso.datetime().optional(),
    })
    .optional(),
  holdExpiresAt: z.iso.datetime().optional(),
  adminNotes: z.string().optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
