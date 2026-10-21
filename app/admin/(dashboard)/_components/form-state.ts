import type { FieldErrors } from "@/lib/booking/admin-forms";

// Returned by every admin form action (used with useActionState).
export type FormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: FieldErrors;
  // Manual bookings: where to go next and the client's private manage link.
  bookingId?: string;
  managePath?: string;
};

export const IDLE: FormState = { status: "idle" };

export function invalid(
  fieldErrors: FieldErrors,
  message = "Please check the highlighted fields.",
): FormState {
  return { status: "error", message, fieldErrors };
}
