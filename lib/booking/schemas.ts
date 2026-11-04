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

export const timeWindowSchema = z
  .object({ start: localTimeSchema, end: localTimeSchema })
  .refine(
    (w) => parseLocalTime(w.start)! < parseLocalTime(w.end)!,
    "Closing time must be after opening time",
  );

// A day's windows, in order and not overlapping (touching is fine).
export const windowsSchema = z
  .array(timeWindowSchema)
  .max(4)
  .refine(
    (windows) =>
      windows.every(
        (w, i) =>
          i === 0 ||
          parseLocalTime(windows[i - 1].end)! <= parseLocalTime(w.start)!,
      ),
    "Opening times must be in order and must not overlap",
  );

export const weeklyHoursSchema = z.object(
  Object.fromEntries(
    WEEKDAYS.map((day) => [day, windowsSchema.default([])]),
  ) as Record<(typeof WEEKDAYS)[number], z.ZodDefault<typeof windowsSchema>>,
);

export const dateOverrideSchema = z.object({
  date: localDateSchema,
  closed: z.boolean().optional(),
  windows: windowsSchema.optional(),
  blockedSlots: z.array(localTimeSchema).max(96).optional(),
  extraSlots: z.array(localTimeSchema).max(96).optional(),
});

export const bookingSettingsSchema = z.object({
  timezone: z.string().min(1),
  slotIntervalMin: z.number().int().min(5).max(240),
  bufferMin: z.number().int().min(0).max(240),
  minNoticeHours: z
    .number()
    .min(0)
    .max(24 * 60),
  maxAdvanceDays: z.number().int().min(0).max(730),
  autoConfirm: z.boolean(),
});

export const bookingStatusSchema = z.enum([
  "pending",
  "confirmed",
  "cancelled",
  "completed",
  "no_show",
]);

export const bookedTimeSchema = z.object({
  startUtc: z.iso.datetime(),
  endUtc: z.iso.datetime(),
  status: bookingStatusSchema,
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
  priceLabel: z.string().optional(),
  durationMin: z.number().int().positive().nullable(),
  depositNote: z.string().optional(),
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
  }),
  date: localDateSchema,
  start: localTimeSchema,
  end: localTimeSchema,
  startUtc: z.iso.datetime(),
  endUtc: z.iso.datetime(),
  client: z.object({
    name: z.string(),
    phone: z.string(),
    email: z.string().optional(),
    notes: z.string().optional(),
  }),
  status: bookingStatusSchema,
  cancelTokenHash: z.string(),
  source: z.enum(["online", "admin"]).optional(),
  memberId: z.string().optional(),
  adminNotes: z.string().optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
