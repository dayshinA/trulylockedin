import { z } from "zod";

import {
  WEEKDAYS,
  type BookingSettings,
  type DateOverride,
  type Service,
  type ServiceCategory,
  type ServiceOption,
  type TimeWindow,
  type WeeklyHours,
} from "@/types/booking";
import { mediaPublicIdSchema } from "@/lib/media/folder";
import {
  bookingRequestSchema,
  optionalEmailSchema,
  phoneSchema,
} from "./request";
import {
  bookingSettingsSchema,
  dateOverrideSchema,
  docIdSchema,
  localTimeSchema,
  serviceSchema,
  weeklyHoursSchema,
} from "./schemas";

// FormData → validated domain objects for the admin forms. Framework-free and
// tested; the Server Actions only add auth and storage.

export type FieldErrors = Partial<Record<string, string[]>>;
export type Parsed<T> =
  | { ok: true; value: T }
  | { ok: false; fieldErrors: FieldErrors; message?: string };

type Form = Pick<FormData, "get" | "getAll">;

const text = (form: Form, key: string) => {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
};
const checked = (form: Form, key: string) => form.get(key) === "on";
const all = (form: Form, key: string) =>
  form.getAll(key).map((v) => (typeof v === "string" ? v.trim() : ""));

function fail(error: z.ZodError, message?: string): Parsed<never> {
  return { ok: false, fieldErrors: z.flattenError(error).fieldErrors, message };
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// "65", "65.5", "£65.50" → 6550 pence.
export function poundsToPence(value: string): number | null {
  const match = /^£?\s*(\d{1,5})(?:\.(\d{1,2}))?$/.exec(
    value.replace(/,/g, ""),
  );
  if (!match) return null;
  return Number(match[1]) * 100 + Number((match[2] ?? "0").padEnd(2, "0"));
}

export function penceToPounds(pence: number): string {
  return pence % 100 === 0 ? String(pence / 100) : (pence / 100).toFixed(2);
}

const serviceFormSchema = z.object({
  name: z.string().min(1, "Enter a name").max(80),
  slug: z
    .string()
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use lowercase letters, numbers and dashes",
    )
    .max(80),
  description: z.string().max(500),
  durationMin: z.coerce
    .number("Enter a duration in minutes")
    .int()
    .min(15, "At least 15 minutes")
    .max(720, "At most 12 hours")
    .nullable(),
  price: z
    .string()
    .refine((v) => poundsToPence(v) !== null, "Enter a price like 65 or 65.50"),
  priceLabel: z.string().max(120, "Keep this under 120 characters"),
  depositNote: z.string().max(200),
  categoryId: docIdSchema.or(z.literal("")).refine(Boolean, "Choose a category"),
  order: z.coerce.number("Enter a number").int().min(0).max(999),
  imagePublicId: z
    .string()
    .refine(
      (v) => v === "" || mediaPublicIdSchema.safeParse(v).success,
      "Upload the photo again",
    ),
});

const MAX_OPTIONS = 50;

// Rows post each field under one name, read in order. Fully blank rows are
// dropped; errors are keyed "<field>.<row>" by the row's position in the form.
// A row keeps its id when renamed; a new row gets one from its name.
function parseOptionRows(form: Form): {
  options: ServiceOption[];
  errors: FieldErrors;
} {
  const ids = all(form, "optionId");
  const prices = all(form, "optionPrice");
  const minutes = all(form, "optionMinutes");
  const options: ServiceOption[] = [];
  const errors: FieldErrors = {};
  const used = new Set(ids.filter(Boolean));

  all(form, "optionName").forEach((name, i) => {
    const price = prices[i] ?? "";
    const extra = minutes[i] ?? "";
    if (!name && !price && !extra) return;

    if (!name) errors[`optionName.${i}`] = ["Enter a name"];
    if (name.length > 80) errors[`optionName.${i}`] = ["Keep this short"];
    const pence = price === "" ? 0 : poundsToPence(price);
    if (pence === null) {
      errors[`optionPrice.${i}`] = ["Enter a price like 20 or 20.50"];
    }
    const durationMin = extra === "" ? null : Number(extra);
    if (
      durationMin !== null &&
      (!Number.isInteger(durationMin) || durationMin < 5 || durationMin > 720)
    ) {
      errors[`optionMinutes.${i}`] = ["Between 5 and 720 minutes"];
    }

    let id = ids[i];
    if (!id) {
      const base = slugify(name) || `option-${i + 1}`;
      id = base;
      for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
      used.add(id);
    }
    options.push({ id, name, pricePence: pence ?? 0, durationMin });
  });

  if (options.length > MAX_OPTIONS) {
    errors.options = [`At most ${MAX_OPTIONS} options`];
  }
  return { options, errors };
}

// On create the id is the slug; on update the id never changes.
export function parseServiceForm(
  form: Form,
  existingId?: string,
): Parsed<Service> {
  const raw = {
    name: text(form, "name"),
    slug: text(form, "slug") || slugify(text(form, "name")),
    description: text(form, "description"),
    durationMin: text(form, "durationMin") || null,
    price: text(form, "price"),
    priceLabel: text(form, "priceLabel"),
    depositNote: text(form, "depositNote"),
    categoryId: text(form, "categoryId"),
    order: text(form, "order") || "0",
    imagePublicId: text(form, "imagePublicId"),
  };
  const parsed = serviceFormSchema.safeParse(raw);
  const { options, errors: optionErrors } = parseOptionRows(form);
  const optionsRequired = checked(form, "optionsRequired");
  if (optionsRequired && options.length === 0) {
    optionErrors.optionsRequired = ["Add an option, or untick this"];
  }
  if (!parsed.success || Object.keys(optionErrors).length > 0) {
    return {
      ok: false,
      fieldErrors: {
        ...(parsed.success ? {} : z.flattenError(parsed.error).fieldErrors),
        ...optionErrors,
      },
    };
  }
  const v = parsed.data;

  const service = serviceSchema.parse({
    id: existingId ?? v.slug,
    name: v.name,
    slug: v.slug,
    description: v.description,
    durationMin: v.durationMin,
    priceFromPence: poundsToPence(v.price)!,
    depositNote: v.depositNote || undefined,
    categoryId: v.categoryId,
    priceLabel: v.priceLabel || undefined,
    imagePublicId: v.imagePublicId || undefined,
    active: checked(form, "active"),
    onlineBooking: checked(form, "onlineBooking"),
    depositRequired: checked(form, "depositRequired"),
    optionsSelectionMode:
      text(form, "optionsSelectionMode") === "single" ? "single" : "multiple",
    optionsRequired,
    options,
    order: v.order,
  });
  return { ok: true, value: service };
}

const categoryFormSchema = z.object({
  name: z.string().min(1, "Enter a name").max(60, "Keep this short"),
  order: z.coerce.number("Enter a number").int().min(0).max(999),
});

// On create the id comes from the name; on update the id never changes.
export function parseCategoryForm(
  form: Form,
  existingId?: string,
): Parsed<ServiceCategory> {
  const parsed = categoryFormSchema.safeParse({
    name: text(form, "name"),
    order: text(form, "order") || "0",
  });
  if (!parsed.success) return fail(parsed.error);
  const id = existingId ?? slugify(parsed.data.name);
  if (!id) return { ok: false, fieldErrors: { name: ["Use letters or numbers"] } };
  return {
    ok: true,
    value: { id, ...parsed.data, visibleOnline: checked(form, "visibleOnline") },
  };
}

// Up to two windows per day: "{day}.start1/end1" and optional "{day}.start2/end2".
function windowsFrom(form: Form, prefix: string): TimeWindow[] {
  const windows: TimeWindow[] = [];
  for (const n of [1, 2]) {
    const start = text(form, `${prefix}start${n}`);
    const end = text(form, `${prefix}end${n}`);
    if (start || end) windows.push({ start, end });
  }
  return windows;
}

export function parseWeeklyForm(form: Form): Parsed<WeeklyHours> {
  const weekly = Object.fromEntries(
    WEEKDAYS.map((day) => [
      day,
      checked(form, `${day}.open`) ? windowsFrom(form, `${day}.`) : [],
    ]),
  );
  const missing = WEEKDAYS.filter(
    (day) => checked(form, `${day}.open`) && weekly[day].length === 0,
  );
  if (missing.length > 0) {
    return {
      ok: false,
      fieldErrors: Object.fromEntries(
        missing.map((day) => [
          day,
          ["Add opening times or mark the day closed"],
        ]),
      ),
    };
  }
  const parsed = weeklyHoursSchema.safeParse(weekly);
  return parsed.success
    ? { ok: true, value: parsed.data }
    : fail(parsed.error, "Check the opening times");
}

export function parseSettingsForm(
  form: Form,
  current: BookingSettings,
): Parsed<BookingSettings> {
  const depositPence = poundsToPence(text(form, "deposit") || "0");
  if (depositPence === null || depositPence > 100_000) {
    return {
      ok: false,
      fieldErrors: { depositPence: ["Enter an amount like 30 or 30.50"] },
    };
  }
  const parsed = bookingSettingsSchema.safeParse({
    timezone: current.timezone,
    depositPence,
    slotIntervalMin: Number(text(form, "slotIntervalMin")),
    bufferMin: Number(text(form, "bufferMin")),
    minNoticeHours: Number(text(form, "minNoticeHours")),
    maxAdvanceDays: Number(text(form, "maxAdvanceDays")),
  });
  return parsed.success ? { ok: true, value: parsed.data } : fail(parsed.error);
}

// "13:00, 13:30 14:00" → ["13:00", "13:30", "14:00"] (sorted, unique).
export function parseTimeList(value: string): string[] | null {
  const items = value.split(/[\s,]+/).filter(Boolean);
  if (
    !items.every((t) => localTimeSchema.safeParse(t).success && t !== "24:00")
  ) {
    return null;
  }
  return [...new Set(items)].sort();
}

// kind: "closed" (shut all day) | "hours" (different opening times) |
// "adjust" (normal hours, just block or add specific times).
export function parseOverrideForm(form: Form): Parsed<DateOverride> {
  const kind = text(form, "kind");
  const date = text(form, "date");
  const blocked = parseTimeList(text(form, "blockedSlots"));
  const extra = parseTimeList(text(form, "extraSlots"));
  const errors: FieldErrors = {};
  if (blocked === null) errors.blockedSlots = ["Use times like 13:00, 13:30"];
  if (extra === null) errors.extraSlots = ["Use times like 18:00, 18:30"];
  if (Object.keys(errors).length > 0) return { ok: false, fieldErrors: errors };

  const override: DateOverride = { date };
  if (kind === "closed") {
    override.closed = true;
  } else {
    if (kind === "hours") override.windows = windowsFrom(form, "");
    if (blocked!.length) override.blockedSlots = blocked!;
    if (extra!.length) override.extraSlots = extra!;
  }

  if (kind === "hours" && override.windows!.length === 0) {
    return { ok: false, fieldErrors: { start1: ["Add the opening times"] } };
  }
  if (kind === "adjust" && !override.blockedSlots && !override.extraSlots) {
    return {
      ok: false,
      fieldErrors: { blockedSlots: ["Add times to block or to add"] },
    };
  }
  const parsed = dateOverrideSchema.safeParse(override);
  return parsed.success
    ? { ok: true, value: parsed.data }
    : fail(parsed.error, "Check the date and times");
}

// Owner bookings usually come in by phone: phone required, email optional.
const manualSchema = bookingRequestSchema.omit({ website: true, acceptTerms: true }).extend({
  phone: phoneSchema,
  email: optionalEmailSchema,
  // Owner can pick any minute, not just the slot grid.
  start: localTimeSchema.refine((t) => t !== "24:00", "Pick a start time"),
  adminNotes: z.string().trim().max(2000).optional(),
});

export type ManualBooking = z.infer<typeof manualSchema>;

export function parseManualBookingForm(form: Form): Parsed<ManualBooking> {
  const parsed = manualSchema.safeParse({
    serviceId: text(form, "serviceId"),
    optionIds: all(form, "optionIds").filter(Boolean),
    date: text(form, "date"),
    start: text(form, "start"),
    name: text(form, "name"),
    phone: text(form, "phone"),
    email: text(form, "email"),
    notes: text(form, "notes"),
    adminNotes: text(form, "adminNotes"),
  });
  return parsed.success ? { ok: true, value: parsed.data } : fail(parsed.error);
}
