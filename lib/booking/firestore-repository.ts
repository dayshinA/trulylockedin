import "server-only";

import {
  FieldPath,
  FieldValue,
  type DocumentReference,
  type DocumentSnapshot,
  type Firestore,
} from "firebase-admin/firestore";

import type {
  BookedTime,
  Booking,
  BookingSettings,
  BookingStatus,
  DateOverride,
  LocalDate,
  Service,
  WeeklyHours,
} from "@/types/booking";
import { DEFAULT_BOOKING_SETTINGS } from "./defaults";
import { occupiesTime } from "./overlap";
import {
  BookingNotConfiguredError,
  sortServices,
  type BookingRepository,
  type CreateBookingInput,
  type CreateBookingResult,
  type SaveResult,
  type StatusChangeResult,
} from "./repository";
import { canTransition, initialStatus } from "./rules";
import {
  bookedTimeSchema,
  bookingSchema,
  bookingSettingsSchema,
  dateOverrideSchema,
  docIdSchema,
  serviceSchema,
  weeklyHoursSchema,
} from "./schemas";
import { parseLocalDate } from "./time";
import { BOOKING_REF_RE } from "./tokens";
import { validateBookingRequest } from "./validate";

// Firestore layout:
//   settings/main                         booking rule fields (others ignored here)
//   availability/weekly                   { sun..sat: TimeWindow[] }
//   availability/overrides/dates/{date}   DateOverride
//   bookings/{id}                         Booking minus id
//   bookingDays/{date}                    { date, bookings: { [id]: BookedTime } }
//
// bookingDays/{date} is the contention point: every write that changes a date's
// availability reads and writes it inside a transaction, so two overlapping
// requests can't both commit. Cancelled bookings are removed from it.

type BookingDay = {
  date: LocalDate;
  bookings: Record<string, BookedTime>;
};

// Firestore rejects undefined values; booking data is plain JSON.
const stripUndefined = <T>(value: T): T => JSON.parse(JSON.stringify(value));

// Rule fields fall back to defaults; settings/main also holds non-booking fields.
function parseSettings(snap: DocumentSnapshot): BookingSettings {
  return {
    ...DEFAULT_BOOKING_SETTINGS,
    ...bookingSettingsSchema.partial().parse(snap.data() ?? {}),
  };
}

// No fallback: inventing opening hours would show fake slots.
function parseWeekly(snap: DocumentSnapshot): WeeklyHours {
  if (!snap.exists) throw new BookingNotConfiguredError("availability/weekly");
  return weeklyHoursSchema.parse(snap.data());
}

function parseOverride(snap: DocumentSnapshot): DateOverride | null {
  if (!snap.exists) return null;
  return dateOverrideSchema.parse({ date: snap.id, ...snap.data() });
}

function parseBookedTimes(snap: DocumentSnapshot): BookedTime[] {
  const day = snap.data() as Partial<BookingDay> | undefined;
  return Object.values(day?.bookings ?? {})
    .map((entry) => bookedTimeSchema.parse(entry))
    .filter((entry) => occupiesTime(entry.status));
}

function parseBooking(snap: DocumentSnapshot): Booking {
  return bookingSchema.parse({ ...snap.data(), id: snap.id });
}

export class FirestoreBookingRepository implements BookingRepository {
  constructor(private readonly db: Firestore) {}

  private get settingsRef() {
    return this.db.doc("settings/main");
  }

  private get weeklyRef() {
    return this.db.doc("availability/weekly");
  }

  private overrideRef(date: LocalDate) {
    return this.db.doc(`availability/overrides/dates/${date}`);
  }

  private dayRef(date: LocalDate): DocumentReference {
    return this.db.doc(`bookingDays/${date}`);
  }

  private get bookingsCol() {
    return this.db.collection("bookings");
  }

  async getSettings() {
    return parseSettings(await this.settingsRef.get());
  }

  async getWeeklyHours() {
    return parseWeekly(await this.weeklyRef.get());
  }

  async getOverride(date: LocalDate) {
    if (!parseLocalDate(date)) return null;
    return parseOverride(await this.overrideRef(date).get());
  }

  async getBookingsForDate(date: LocalDate) {
    if (!parseLocalDate(date)) return [];
    const snap = await this.bookingsCol.where("date", "==", date).get();
    return snap.docs
      .map(parseBooking)
      .sort((a, b) => a.startUtc.localeCompare(b.startUtc));
  }

  async getBookedTimes(date: LocalDate) {
    if (!parseLocalDate(date)) return [];
    return parseBookedTimes(await this.dayRef(date).get());
  }

  async getService(id: string) {
    if (!docIdSchema.safeParse(id).success) return null;
    const snap = await this.db.collection("services").doc(id).get();
    return snap.exists
      ? serviceSchema.parse({ ...snap.data(), id: snap.id })
      : null;
  }

  async listServices({ activeOnly = false } = {}) {
    const col = this.db.collection("services");
    const snap = await (
      activeOnly ? col.where("active", "==", true) : col
    ).get();
    return sortServices(
      snap.docs.map((doc) =>
        serviceSchema.parse({ ...doc.data(), id: doc.id }),
      ),
    );
  }

  async getBookingByRef(ref: string) {
    if (!BOOKING_REF_RE.test(ref)) return null;
    const snap = await this.bookingsCol.where("ref", "==", ref).limit(1).get();
    return snap.empty ? null : parseBooking(snap.docs[0]);
  }

  async listBookings({ fromUtc, toUtc }: { fromUtc: string; toUtc?: string }) {
    let query = this.bookingsCol.where("startUtc", ">=", fromUtc);
    if (toUtc) query = query.where("startUtc", "<", toUtc);
    const snap = await query.orderBy("startUtc").get();
    return snap.docs.map(parseBooking);
  }

  async updateAdminNotes(
    id: string,
    adminNotes: string,
    now: Date,
  ): Promise<StatusChangeResult> {
    const booking = await this.getBooking(id);
    if (!booking) return { ok: false, reason: "not_found" };
    const updatedAt = now.toISOString();
    await this.bookingsCol.doc(id).update({ adminNotes, updatedAt });
    return { ok: true, booking: { ...booking, adminNotes, updatedAt } };
  }

  async getBooking(id: string) {
    if (!docIdSchema.safeParse(id).success) return null;
    const snap = await this.bookingsCol.doc(id).get();
    return snap.exists ? parseBooking(snap) : null;
  }

  async createBooking(input: CreateBookingInput): Promise<CreateBookingResult> {
    // Guards the document paths below; validateBookingRequest repeats it.
    if (!parseLocalDate(input.date))
      return { ok: false, reason: "invalid_date" };

    return this.db.runTransaction(async (tx) => {
      const dayRef = this.dayRef(input.date);
      // Rules are read in the transaction too, so an owner edit mid-booking
      // forces a retry against the new rules.
      const [settingsSnap, weeklySnap, overrideSnap, daySnap] = await tx.getAll(
        this.settingsRef,
        this.weeklyRef,
        this.overrideRef(input.date),
        dayRef,
      );
      const settings = parseSettings(settingsSnap);

      const result = validateBookingRequest({
        date: input.date,
        start: input.start,
        service: input.service,
        weekly: parseWeekly(weeklySnap),
        override: parseOverride(overrideSnap),
        bookings: parseBookedTimes(daySnap),
        settings,
        now: input.now,
        mode: input.mode,
      });
      if (!result.ok) return result;

      const bookingRef = this.bookingsCol.doc();
      const timestamp = input.now.toISOString();
      const booking: Booking = {
        id: bookingRef.id,
        ref: input.ref,
        service: {
          id: input.service.id,
          name: input.service.name,
          durationMin: input.service.durationMin,
          priceFromPence: input.service.priceFromPence,
        },
        date: input.date,
        start: result.slot.start,
        end: result.slot.end,
        startUtc: result.slot.startUtc,
        endUtc: result.slot.endUtc,
        client: input.client,
        status: initialStatus(settings, input.mode),
        cancelTokenHash: input.cancelTokenHash,
        source: input.mode === "owner" ? "admin" : "online",
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      const { id, ...data } = booking;
      tx.create(bookingRef, stripUndefined(data));
      tx.set(
        dayRef,
        {
          date: input.date,
          bookings: {
            [id]: {
              startUtc: booking.startUtc,
              endUtc: booking.endUtc,
              status: booking.status,
            },
          },
        },
        { merge: true },
      );
      return { ok: true, booking: stripUndefined(booking) };
    });
  }

  updateBookingStatus(
    id: string,
    status: Exclude<BookingStatus, "cancelled">,
    now: Date,
  ) {
    return this.transition(id, status, now);
  }

  cancelBooking(id: string, now: Date) {
    return this.transition(id, "cancelled", now);
  }

  private transition(
    id: string,
    status: BookingStatus,
    now: Date,
  ): Promise<StatusChangeResult> {
    if (!docIdSchema.safeParse(id).success) {
      return Promise.resolve({ ok: false, reason: "not_found" });
    }
    return this.db.runTransaction(async (tx) => {
      const bookingRef = this.bookingsCol.doc(id);
      const snap = await tx.get(bookingRef);
      if (!snap.exists) return { ok: false, reason: "not_found" } as const;

      const booking = parseBooking(snap);
      if (!canTransition(booking.status, status)) {
        return { ok: false, reason: "invalid_transition" } as const;
      }

      const updatedAt = now.toISOString();
      tx.update(bookingRef, { status, updatedAt });
      tx.set(
        this.dayRef(booking.date),
        {
          bookings: {
            [id]: occupiesTime(status) ? { status } : FieldValue.delete(),
          },
        },
        { merge: true },
      );
      return { ok: true, booking: { ...booking, status, updatedAt } } as const;
    });
  }

  async saveSettings(settings: BookingSettings) {
    // Merge: settings/main also holds non-booking fields.
    await this.settingsRef.set(bookingSettingsSchema.parse(settings), {
      merge: true,
    });
  }

  async saveWeeklyHours(weekly: WeeklyHours) {
    await this.weeklyRef.set(weeklyHoursSchema.parse(weekly));
  }

  async listOverrides(fromDate: LocalDate) {
    if (!parseLocalDate(fromDate)) return [];
    const snap = await this.db
      .collection("availability/overrides/dates")
      .where(FieldPath.documentId(), ">=", fromDate)
      .get();
    return snap.docs.map(parseOverride).filter((o) => o !== null);
  }

  async saveOverride(override: DateOverride) {
    const { date, ...data } = dateOverrideSchema.parse(override);
    await this.overrideRef(date).set(stripUndefined(data));
  }

  async deleteOverride(date: LocalDate) {
    if (!parseLocalDate(date)) return;
    await this.overrideRef(date).delete();
  }

  saveService(
    service: Service,
    mode: "create" | "update",
  ): Promise<SaveResult> {
    const { id, ...data } = serviceSchema.parse(service);
    const ref = this.db.collection("services").doc(id);
    return this.db.runTransaction(async (tx) => {
      const exists = (await tx.get(ref)).exists;
      if (mode === "create" && exists) return { ok: false, reason: "exists" };
      if (mode === "update" && !exists) {
        return { ok: false, reason: "not_found" };
      }
      // Full replace, so cleared optional fields are removed.
      tx.set(ref, stripUndefined(data));
      return { ok: true };
    });
  }

  async deleteService(id: string) {
    if (!docIdSchema.safeParse(id).success) return;
    await this.db.collection("services").doc(id).delete();
  }
}
