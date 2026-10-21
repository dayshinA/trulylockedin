import type { BookingStatus } from "@/types/booking";

export const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "Awaiting confirmation",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  completed: "Completed",
  no_show: "No-show",
};

// Admin button labels for moving a booking to each status.
export const STATUS_ACTIONS: Record<BookingStatus, string> = {
  pending: "Mark pending",
  confirmed: "Confirm",
  cancelled: "Cancel booking",
  completed: "Mark completed",
  no_show: "Mark no-show",
};
