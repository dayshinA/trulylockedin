import type {
  BookedTime,
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
  Slot,
  WeeklyHours,
} from "@/types/booking";
import { getAvailableSlots } from "./availability";

// Thrown when required booking data (e.g. weekly hours) has never been set up.
export class BookingNotConfiguredError extends Error {
  constructor(what: string) {
    super(`Booking is not configured: ${what} is missing`);
    this.name = "BookingNotConfiguredError";
  }
}

export type CreateBookingInput = {
  service: Service;
  date: LocalDate;
  start: LocalTime;
  client: BookingClient;
  ref: string;
  cancelTokenHash: string;
  now: Date;
  // Defaults to "client". Owner bookings are confirmed immediately.
  mode?: BookingMode;
};

export type CreateBookingResult =
  | { ok: true; booking: Booking }
  | { ok: false; reason: BookingRejection };

export type StatusChangeResult =
  | { ok: true; booking: Booking }
  | { ok: false; reason: "not_found" | "invalid_transition" };

// Storage seam: the engine and Server Actions depend on this, never on a database.
// Implementation: firestore-repository.ts.
export interface BookingRepository {
  getSettings(): Promise<BookingSettings>;
  getWeeklyHours(): Promise<WeeklyHours>;
  getOverride(date: LocalDate): Promise<DateOverride | null>;
  // Full bookings for a date (admin views), ordered by start time.
  getBookingsForDate(date: LocalDate): Promise<Booking[]>;
  // Times that block availability on a date; cancelled bookings excluded.
  getBookedTimes(date: LocalDate): Promise<BookedTime[]>;
  getBooking(id: string): Promise<Booking | null>;
  // Inactive services are returned too; callers decide (availability rejects them).
  getService(id: string): Promise<Service | null>;
  // Ordered by `order`, then name.
  listServices(options?: { activeOnly?: boolean }): Promise<Service[]>;
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
  // the rest get "slot_taken".
  createBooking(input: CreateBookingInput): Promise<CreateBookingResult>;
  // Enforces rules.canTransition. Use cancelBooking for cancellations.
  updateBookingStatus(
    id: string,
    status: Exclude<BookingStatus, "cancelled">,
    now: Date,
  ): Promise<StatusChangeResult>;
  // Frees the time in the same write (Firestore: removes the bookingDays entry).
  cancelBooking(id: string, now: Date): Promise<StatusChangeResult>;

  // Admin config writes. They never change bookings that already exist.
  saveSettings(settings: BookingSettings): Promise<void>;
  saveWeeklyHours(weekly: WeeklyHours): Promise<void>;
  // Overrides dated fromDate or later, in date order.
  listOverrides(fromDate: LocalDate): Promise<DateOverride[]>;
  // Replaces the whole override for its date.
  saveOverride(override: DateOverride): Promise<void>;
  deleteOverride(date: LocalDate): Promise<void>;
  saveService(service: Service, mode: "create" | "update"): Promise<SaveResult>;
  deleteService(id: string): Promise<void>;
}

export type SaveResult =
  | { ok: true }
  | { ok: false; reason: "exists" | "not_found" };

export function sortServices(services: Service[]): Service[] {
  return services.sort(
    (a, b) => a.order - b.order || a.name.localeCompare(b.name),
  );
}

export async function loadAvailableSlots(
  repo: BookingRepository,
  { date, service, now }: { date: LocalDate; service: Service; now: Date },
): Promise<Slot[]> {
  const [settings, weekly, override, bookings] = await Promise.all([
    repo.getSettings(),
    repo.getWeeklyHours(),
    repo.getOverride(date),
    repo.getBookedTimes(date),
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
