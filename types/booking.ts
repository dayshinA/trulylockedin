// Salon-local calendar date, "yyyy-mm-dd" (in settings.timezone).
export type LocalDate = string;
// Salon-local wall-clock time, "HH:mm" ("24:00" allowed as a window end).
export type LocalTime = string;

export type TimeWindow = {
  start: LocalTime;
  end: LocalTime;
};

export const WEEKDAYS = [
  "sun",
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
] as const;
export type Weekday = (typeof WEEKDAYS)[number];

// availability/weekly — an empty list means closed that day.
export type WeeklyHours = Record<Weekday, TimeWindow[]>;

// availability/overrides/dates/{date}
export type DateOverride = {
  date: LocalDate;
  // Closes the whole day; windows and extraSlots are ignored.
  closed?: boolean;
  // Replaces the weekly windows for this date.
  windows?: TimeWindow[];
  // Each blocks one slotIntervalMin cell from that time: no appointment may run through it.
  blockedSlots?: LocalTime[];
  // Extra start times offered even outside the windows (still checked for clashes).
  extraSlots?: LocalTime[];
};

// settings/main (booking rules part)
export type BookingSettings = {
  timezone: string;
  slotIntervalMin: number;
  // Gap required after each appointment before the next one starts.
  bufferMin: number;
  minNoticeHours: number;
  // Last bookable date is today + maxAdvanceDays (salon-local).
  maxAdvanceDays: number;
  autoConfirm: boolean;
};

// serviceCategories/{id}
export type ServiceCategory = {
  id: string;
  name: string;
  order: number;
  visibleOnline: boolean;
};

// Stored on its service, in display order.
export type ServiceOption = {
  id: string;
  name: string;
  // Added to the service's base price; 0 if free.
  pricePence: number;
  // Added to the service's duration.
  durationMin: number | null;
};

export type OptionsSelectionMode = "single" | "multiple";

// services/{id}
export type Service = {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string;
  // Base price; selected options are added to it (see quote.ts).
  priceFromPence: number;
  // Shown next to the price, e.g. "Up to 100 locs".
  priceLabel?: string;
  // Null when it varies. Slots can't be worked out, so it can't be booked yet.
  durationMin: number | null;
  depositNote?: string;
  imagePublicId?: string;
  active: boolean;
  onlineBooking: boolean;
  optionsSelectionMode: OptionsSelectionMode;
  optionsRequired: boolean;
  options: ServiceOption[];
  order: number;
};

export type CatalogueCategory = ServiceCategory & { services: Service[] };

// What a booking keeps. durationMin and priceFromPence are the appointment's
// totals, options included. Older bookings have no options.
export type BookedService = {
  id: string;
  name: string;
  durationMin: number;
  priceFromPence: number;
  options?: ServiceOption[];
};

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "no_show";

export type BookingSource = "online" | "admin";

// "client" applies every public rule; "owner" (manual bookings from the admin)
// skips hours, notice, advance window, blocks and buffer but still refuses clashes.
export type BookingMode = "client" | "owner";

export type BookingClient = {
  name: string;
  phone: string;
  email?: string;
  notes?: string;
};

export type Booking = {
  id: string;
  // Short human code shown to the client, e.g. "TLI-7KQ2".
  ref: string;
  // Snapshot so later price/duration edits don't rewrite history.
  service: BookedService;
  date: LocalDate;
  start: LocalTime;
  end: LocalTime;
  startUtc: string;
  endUtc: string;
  client: BookingClient;
  status: BookingStatus;
  cancelTokenHash: string;
  // "admin" = entered by the owner (phone/walk-in); missing on older docs means online.
  source?: BookingSource;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
};

// What availability needs to know about an existing booking. Firestore keeps
// these per date in bookingDays/{date} as the transaction's contention point.
export type BookedTime = Pick<Booking, "startUtc" | "endUtc" | "status">;

export type Slot = {
  start: LocalTime;
  end: LocalTime;
  startUtc: string;
  endUtc: string;
};

export type BookingRejection =
  | "invalid_date"
  | "invalid_time"
  | "service_unavailable"
  | "options_required"
  | "invalid_options"
  | "outside_booking_window"
  | "closed"
  | "not_a_slot"
  | "too_soon"
  | "blocked"
  | "slot_taken"
  // Owner bookings only: the appointment would run past midnight.
  | "outside_day";
