import type {
  BookedTime,
  BookingDeposit,
  BookingMode,
  Booking,
  BookingClient,
  BookingRejection,
  BookingSettings,
  BookingStatus,
  DateOverride,
  LocalDate,
  LocalTime,
  Service,
  ServiceCategory,
  Slot,
  WeeklyHours,
} from "@/types/booking";
import { getAvailableSlots, type AvailabilityInput } from "./availability";

// Thrown when required booking data (e.g. weekly hours) has never been set up.
export class BookingNotConfiguredError extends Error {
  constructor(what: string) {
    super(`Booking is not configured: ${what} is missing`);
    this.name = "BookingNotConfiguredError";
  }
}

export type CreateBookingInput = {
  service: Service;
  // Checked against the service and priced here, so the browser can't set a price.
  optionIds?: string[];
  date: LocalDate;
  start: LocalTime;
  client: BookingClient;
  ref: string;
  cancelTokenHash: string;
  now: Date;
  // Defaults to "client". Owner bookings are confirmed immediately.
  mode?: BookingMode;
  // The signed-in member making an online booking.
  memberId?: string;
  // Already checked to be in REFERENCE_FOLDER (bookingRequestSchema).
  referencePhotos?: string[];
};

export type CreateBookingResult =
  | { ok: true; booking: Booking }
  | { ok: false; reason: BookingRejection };

// What a completed Stripe payment page reports for a deposit.
export type DepositPayment = {
  checkoutSessionId: string;
  paymentIntentId: string;
  amountPence: number;
};

export type ConfirmDepositResult =
  // This call confirmed it (send the emails).
  | { kind: "confirmed"; booking: Booking }
  // Already confirmed by this payment (webhook and return page both call).
  | { kind: "already"; booking: Booking }
  // The payment can't be kept: the hold is gone, or its time was taken after
  // the hold lapsed. The booking (if any) is now cancelled; refund the payment.
  | { kind: "refund"; booking: Booking | null };

export type StatusChangeResult =
  | { ok: true; booking: Booking }
  | { ok: false; reason: "not_found" | "invalid_transition" };

// Storage seam: the engine and Server Actions depend on this, never on a database.
// Implementation: firestore-repository.ts.
export interface BookingRepository {
  getSettings(): Promise<BookingSettings>;
  getWeeklyHours(): Promise<WeeklyHours>;
  getOverride(date: LocalDate): Promise<DateOverride | null>;
  // Full bookings for a date (admin views), ordered by start time. Like every
  // list below, it leaves out bookings still awaiting their deposit.
  getBookingsForDate(date: LocalDate): Promise<Booking[]>;
  // Times that block availability on a date at `now`; cancelled bookings and
  // lapsed deposit holds excluded.
  getBookedTimes(date: LocalDate, now: Date): Promise<BookedTime[]>;
  getBooking(id: string): Promise<Booking | null>;
  // Inactive services are returned too; callers decide (availability rejects them).
  getService(id: string): Promise<Service | null>;
  // Ordered by `order`, then name.
  listServices(options?: { activeOnly?: boolean }): Promise<Service[]>;
  getCategory(id: string): Promise<ServiceCategory | null>;
  // Ordered by `order`, then name.
  listCategories(): Promise<ServiceCategory[]>;
  getBookingByRef(ref: string): Promise<Booking | null>;
  // Bookings starting in [fromUtc, toUtc), ordered by start; any status.
  listBookings(range: { fromUtc: string; toUtc?: string }): Promise<Booking[]>;
  updateAdminNotes(
    id: string,
    adminNotes: string,
    now: Date,
  ): Promise<StatusChangeResult>;
  // Atomic: re-reads rules and bookings, runs validateBookingRequest, and writes
  // only if it passes. Concurrent requests for overlapping times: one wins,
  // the rest get "slot_taken". An online booking for a service that takes a
  // deposit is created as awaiting_deposit, holding its time until
  // holdExpiresAt.
  createBooking(input: CreateBookingInput): Promise<CreateBookingResult>;
  // The Stripe payment page made for a held booking.
  attachCheckoutSession(id: string, checkoutSessionId: string): Promise<void>;
  // Atomic. Safe to call repeatedly and concurrently for the same payment.
  confirmDeposit(
    id: string,
    payment: DepositPayment,
    now: Date,
  ): Promise<ConfirmDepositResult>;
  // Deletes a booking still awaiting its deposit and frees its time. With a
  // session id, only if that's the booking's payment page. Returns the
  // released booking, or null if there was nothing to release.
  releaseHold(id: string, checkoutSessionId?: string): Promise<Booking | null>;
  updateDeposit(
    id: string,
    deposit: BookingDeposit,
    now: Date,
  ): Promise<void>;
  // Enforces rules.canTransition. Use cancelBooking for cancellations.
  updateBookingStatus(
    id: string,
    status: Exclude<BookingStatus, "cancelled">,
    now: Date,
  ): Promise<StatusChangeResult>;
  // Frees the time in the same write (Firestore: removes the bookingDays entry).
  cancelBooking(id: string, now: Date): Promise<StatusChangeResult>;
  // Every booking linked to a member, any status, in no particular order.
  listBookingsByMember(memberId: string): Promise<Booking[]>;
  // Number of bookings (any status) per member id.
  countBookingsByMember(): Promise<Map<string, number>>;
  // A deleted member's bookings stay as guest bookings.
  unlinkMember(memberId: string): Promise<void>;
  // Every booking that still has reference photos, any status.
  listBookingsWithReferencePhotos(): Promise<Booking[]>;
  // After the photos were deleted from Cloudinary.
  clearReferencePhotos(id: string): Promise<void>;

  // Admin config writes. They never change bookings that already exist.
  saveSettings(settings: BookingSettings): Promise<void>;
  saveWeeklyHours(weekly: WeeklyHours): Promise<void>;
  // Overrides dated fromDate or later, in date order.
  listOverrides(fromDate: LocalDate): Promise<DateOverride[]>;
  // Replaces the whole override for its date.
  saveOverride(override: DateOverride): Promise<void>;
  deleteOverride(date: LocalDate): Promise<void>;
  saveService(service: Service, mode: "create" | "update"): Promise<SaveResult>;
  saveCategory(
    category: ServiceCategory,
    mode: "create" | "update",
  ): Promise<SaveResult>;
  // Refused while any service is still in the category.
  deleteCategory(id: string): Promise<DeleteCategoryResult>;
  deleteService(id: string): Promise<void>;
}

export type SaveResult =
  | { ok: true }
  | { ok: false; reason: "exists" | "not_found" };

export type DeleteCategoryResult =
  | { ok: true }
  | { ok: false; reason: "not_empty" };

export function sortServices(services: Service[]): Service[] {
  return services.sort(
    (a, b) => a.order - b.order || a.name.localeCompare(b.name),
  );
}

export function sortCategories(categories: ServiceCategory[]) {
  return categories.sort(
    (a, b) => a.order - b.order || a.name.localeCompare(b.name),
  );
}

export async function loadAvailableSlots(
  repo: BookingRepository,
  {
    date,
    service,
    now,
  }: {
    date: LocalDate;
    service: AvailabilityInput["service"];
    now: Date;
  },
): Promise<Slot[]> {
  const [settings, weekly, override, bookings] = await Promise.all([
    repo.getSettings(),
    repo.getWeeklyHours(),
    repo.getOverride(date),
    repo.getBookedTimes(date, now),
  ]);
  return getAvailableSlots({
    date,
    service,
    weekly,
    override,
    bookings,
    settings,
    now,
  });
}
