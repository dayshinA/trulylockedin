"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { verifyAdmin } from "@/lib/auth/dal";
import { parseManualBookingForm } from "@/lib/booking/admin-forms";
import { bookingStatusSchema, docIdSchema } from "@/lib/booking/schemas";
import { notifyBooking } from "@/lib/email/booking-emails";
import { bookingRepository } from "@/lib/booking/server";
import {
  createBookingRef,
  createCancelToken,
  hashToken,
} from "@/lib/booking/tokens";
import {
  OWNER_REJECTION_MESSAGES,
  REJECTION_MESSAGES,
} from "@/lib/booking/validate";
import { invalid, type FormState } from "../_components/form-state";

const statusInput = z.object({
  id: docIdSchema,
  status: bookingStatusSchema.exclude(["pending"]),
});

// Invalid transitions are refused by the repository (rules.canTransition).
export async function setBookingStatusAction(formData: FormData) {
  await verifyAdmin();
  const parsed = statusInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;

  const { id, status } = parsed.data;
  const repo = bookingRepository();
  const now = new Date();
  const result =
    status === "cancelled"
      ? await repo.cancelBooking(id, now)
      : await repo.updateBookingStatus(id, status, now);
  if (result.ok) notifyBooking({ kind: "status_changed", id });
  else console.warn("Status change refused", id, status, result.reason);
  refresh();
}

const notesInput = z.object({
  id: docIdSchema,
  adminNotes: z.string().trim().max(2000),
});

export async function saveAdminNotesAction(formData: FormData) {
  await verifyAdmin();
  const parsed = notesInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await bookingRepository().updateAdminNotes(
    parsed.data.id,
    parsed.data.adminNotes,
    new Date(),
  );
  refresh();
}

// Phone and walk-in bookings: any time, confirmed straight away, but never on
// top of another appointment (owner mode in validateBookingRequest).
export async function createManualBookingAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  await verifyAdmin();
  const parsed = parseManualBookingForm(formData);
  if (!parsed.ok) return invalid(parsed.fieldErrors);
  const input = parsed.value;

  const repo = bookingRepository();
  const service = await repo.getService(input.serviceId);
  if (!service) return invalid({ serviceId: ["Choose a service"] });

  const now = new Date();
  const cancelToken = createCancelToken();
  const result = await repo.createBooking({
    service,
    optionIds: input.optionIds,
    date: input.date,
    start: input.start,
    client: {
      name: input.name,
      phone: input.phone,
      email: input.email,
      notes: input.notes,
    },
    ref: createBookingRef(),
    cancelTokenHash: hashToken(cancelToken),
    now,
    mode: "owner",
  });
  if (!result.ok) {
    return {
      status: "error",
      message:
        OWNER_REJECTION_MESSAGES[result.reason] ??
        REJECTION_MESSAGES[result.reason],
    };
  }

  const { booking } = result;
  // Emails the client (if they gave an email); the owner made it, so no
  // owner email.
  notifyBooking({ kind: "created", ref: booking.ref, cancelToken });
  if (input.adminNotes) {
    await repo.updateAdminNotes(booking.id, input.adminNotes, now);
  }
  return {
    status: "success",
    message: `Booked ${booking.client.name} for ${booking.start}–${booking.end}.`,
    bookingId: booking.id,
    managePath: `/book/${booking.ref}#t=${cancelToken}`,
  };
}
