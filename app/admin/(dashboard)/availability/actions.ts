"use server";

import { refresh, updateTag } from "next/cache";

import { verifyAdmin } from "@/lib/auth/dal";
import {
  parseOverrideForm,
  parseSettingsForm,
  parseWeeklyForm,
} from "@/lib/booking/admin-forms";
import { bookingRepository } from "@/lib/booking/server";
import { PUBLIC_TAGS } from "@/lib/data/public";
import { invalid, type FormState } from "../_components/form-state";

// Changes apply to new bookings only; existing appointments are kept.

export async function saveWeeklyHoursAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  await verifyAdmin();
  const parsed = parseWeeklyForm(formData);
  if (!parsed.ok) return invalid(parsed.fieldErrors, parsed.message);
  await bookingRepository().saveWeeklyHours(parsed.value);
  updateTag(PUBLIC_TAGS.hours);
  refresh();
  return { status: "success", message: "Opening hours saved." };
}

export async function saveBookingRulesAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  await verifyAdmin();
  const repo = bookingRepository();
  const parsed = parseSettingsForm(formData, await repo.getSettings());
  if (!parsed.ok) return invalid(parsed.fieldErrors, parsed.message);
  await repo.saveSettings(parsed.value);
  updateTag(PUBLIC_TAGS.bookingSettings);
  refresh();
  return { status: "success", message: "Booking rules saved." };
}

export async function saveOverrideAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  await verifyAdmin();
  const parsed = parseOverrideForm(formData);
  if (!parsed.ok) return invalid(parsed.fieldErrors, parsed.message);
  await bookingRepository().saveOverride(parsed.value);
  refresh();
  return { status: "success", message: "Saved for that date." };
}

export async function deleteOverrideAction(formData: FormData) {
  await verifyAdmin();
  const date = formData.get("date");
  if (typeof date === "string") await bookingRepository().deleteOverride(date);
  refresh();
}
