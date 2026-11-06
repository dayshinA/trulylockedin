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
  BookingDeposit,
  BookingSettings,
  BookingStatus,
  DateOverride,
  LocalDate,
  Service,
  ServiceCategory,
  WeeklySchedule,
} from "@/types/booking";
import { DEFAULT_BOOKING_SETTINGS } from "./defaults";
import { depositFor, holdTimes } from "./deposit-rules";
import { blocksTime, fitsAlongside, occupiesTime } from "./overlap";
import {
  BookingNotConfiguredError,
  sortCategories,
  sortServices,
  type BookingRepository,
  type CreateBookingInput,
  type ConfirmDepositResult,
  type CreateBookingResult,
  type DeleteCategoryResult,
  type DepositPayment,
  type SaveResult,
  type StatusChangeResult,
} from "./repository";
import { quoteForBooking } from "./quote";
import { canTransition, dayRulesFor } from "./rules";
import {
  bookedTimeSchema,
  bookingSchema,
  bookingSettingsSchema,
  dateOverrideSchema,
  docIdSchema,
  serviceCategorySchema,
  serviceSchema,
  weeklyHoursSchema,
  weeklyRulesSchema,
} from "./schemas";
import { addDays, parseLocalDate } from "./time";
import { BOOKING_REF_RE } from "./tokens";
import { validateBookingRequest } from "./validate";

// Firestore layout:
//   settings/main                         booking rule fields (others ignored here)
//   serviceCategories/{id}                ServiceCategory minus id
//   services/{id}                         Service minus id, options stored inline
//   availability/weekly                   { sun..sat: TimeWindow[], rules: { [day]: DayRules } }
//   availability/overrides/dates/{date}   DateOverride
//   bookings/{id}                         Booking minus id
//   bookingDays/{date}                    { date, bookings: { [id]: BookedTime } }
//
// bookingDays/{date} is the contention point: every write that changes a date's
// availability reads and writes it inside a transaction, so two overlapping
// requests can't both commit. Cancelled bookings are removed from it. A
// booking sits under its real start date; appointments can run past midnight,
// so availability checks read the dates either side too.

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
function parseWeekly(snap: DocumentSnapshot): WeeklySchedule {
  if (!snap.exists) throw new BookingNotConfiguredError("availability/weekly");
  const data = snap.data() ?? {};
  return {
    hours: weeklyHoursSchema.parse(data),
    rules: weeklyRulesSchema.parse(data.rules ?? {}),
  };
}

function parseOverride(snap: DocumentSnapshot): DateOverride | null {
  if (!snap.exists) return null;
  return dateOverrideSchema.parse({ date: snap.id, ...snap.data() });
}

function parseDayEntries(snap: DocumentSnapshot): [string, BookedTime][] {
  const day = snap.data() as Partial<BookingDay> | undefined;
  return Object.entries(day?.bookings ?? {}).map(([id, entry]) => [
    id,
    bookedTimeSchema.parse(entry),
  ]);
}

function parseBookedTimes(snap: DocumentSnapshot, nowMs: number): BookedTime[] {
  return parseDayEntries(snap)
    .map(([, entry]) => entry)
    .filter((entry) => blocksTime(entry, nowMs));
}

// Holds are the client's private business until the deposit is paid.
const listed = (booking: Booking) => booking.status !== "awaiting_deposit";

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

  // The date and the dates either side, in that order of days.
  private nearbyDayRefs(date: LocalDate): DocumentReference[] {
    return [-1, 0, 1].map((d) => this.dayRef(addDays(date, d)));
  }

  private get bookingsCol() {
    return this.db.collection("bookings");
  }

  async getSettings() {
    return parseSettings(await this.settingsRef.get());
  }

  async getWeekly() {
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
      .filter(listed)
      .sort((a, b) => a.startUtc.localeCompare(b.startUtc));
  }

  async getBookedTimes(date: LocalDate, now: Date) {
    if (!parseLocalDate(date)) return [];
    const snaps = await this.db.getAll(...this.nearbyDayRefs(date));
    return snaps.flatMap((snap) => parseBookedTimes(snap, now.getTime()));
  }

  async getBookedTimesBetween(from: LocalDate, to: LocalDate, now: Date) {
    const result = new Map<LocalDate, BookedTime[]>();
    if (!parseLocalDate(from) || !parseLocalDate(to)) return result;
    const snap = await this.db
      .collection("bookingDays")
      .where(FieldPath.documentId(), ">=", from)
      .where(FieldPath.documentId(), "<=", to)
      .get();
    for (const doc of snap.docs) {
      result.set(doc.id, parseBookedTimes(doc, now.getTime()));
    }
    return result;
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

  async getCategory(id: string) {
    if (!docIdSchema.safeParse(id).success) return null;
    const snap = await this.db.collection("serviceCategories").doc(id).get();
    return snap.exists
      ? serviceCategorySchema.parse({ ...snap.data(), id: snap.id })
      : null;
  }

  async listCategories() {
    const snap = await this.db.collection("serviceCategories").get();
    return sortCategories(
      snap.docs.map((doc) =>
        serviceCategorySchema.parse({ ...doc.data(), id: doc.id }),
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
    return snap.docs.map(parseBooking).filter(listed);
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

    const priced = quoteForBooking(
      input.service,
      input.optionIds ?? [],
      input.mode,
    );
    if (!priced.ok) return priced;

    return this.db.runTransaction(async (tx) => {
      // Rules are read in the transaction too, so an owner edit mid-booking
      // forces a retry against the new rules. So are the neighbouring days,
      // whose late appointments may run into this one.
      const [settingsSnap, weeklySnap, overrideSnap, ...daySnaps] =
        await tx.getAll(
          this.settingsRef,
          this.weeklyRef,
          this.overrideRef(input.date),
          ...this.nearbyDayRefs(input.date),
        );
      const settings = parseSettings(settingsSnap);

      const result = validateBookingRequest({
        date: input.date,
        start: input.start,
        service: {
          active: input.service.active,
          durationMin: priced.quote.durationMin,
        },
        weekly: parseWeekly(weeklySnap),
        override: parseOverride(overrideSnap),
        bookings: daySnaps.flatMap((snap) =>
          parseBookedTimes(snap, input.now.getTime()),
        ),
        settings,
        now: input.now,
        mode: input.mode,
      });
      if (!result.ok) return result;

      // Premium is decided here, from the rules just read: online by the
      // start time, owner bookings by their own choice.
      const premiumTime =
        input.mode === "owner" ? input.premium === true : !!result.slot.premium;
      const repriced = premiumTime
        ? quoteForBooking(
            input.service,
            input.optionIds ?? [],
            input.mode,
            true,
          )
        : priced;
      if (!repriced.ok) return repriced;
      const { quote } = repriced;

      const bookingRef = this.bookingsCol.doc();
      const timestamp = input.now.toISOString();
      const depositPence =
        input.mode === "owner"
          ? 0
          : depositFor(settings.depositPence, input.service, quote.pricePence);
      const hold = depositPence > 0 ? holdTimes(input.now) : null;
      const booking: Booking = {
        id: bookingRef.id,
        ref: input.ref,
        service: {
          id: input.service.id,
          name: input.service.name,
          durationMin: quote.durationMin,
          priceFromPence: quote.pricePence,
          options: quote.options.length > 0 ? quote.options : undefined,
          premium: quote.premium ? true : undefined,
        },
        date: result.slot.date,
        start: result.slot.start,
        end: result.slot.end,
        startUtc: result.slot.startUtc,
        endUtc: result.slot.endUtc,
        client: input.client,
        status: hold ? "awaiting_deposit" : "confirmed",
        cancelTokenHash: input.cancelTokenHash,
        source: input.mode === "owner" ? "admin" : "online",
        memberId: input.memberId,
        referencePhotos: input.referencePhotos?.length
          ? input.referencePhotos
          : undefined,
        termsVersion: input.mode === "owner" ? undefined : input.termsVersion,
        deposit: hold
          ? { amountPence: depositPence, status: "awaiting" }
          : undefined,
        holdExpiresAt: hold?.holdExpiresAt,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      const { id, ...data } = booking;
      tx.create(bookingRef, stripUndefined(data));
      tx.set(
        this.dayRef(booking.date),
        {
          date: booking.date,
          bookings: {
            [id]: stripUndefined({
              startUtc: booking.startUtc,
              endUtc: booking.endUtc,
              status: booking.status,
              holdExpiresAt: booking.holdExpiresAt,
            }),
          },
        },
        { merge: true },
      );
      return { ok: true, booking: stripUndefined(booking) };
    });
  }

  async attachCheckoutSession(id: string, checkoutSessionId: string) {
    if (!docIdSchema.safeParse(id).success) return;
    await this.bookingsCol
      .doc(id)
      .update({ "deposit.checkoutSessionId": checkoutSessionId });
  }

  confirmDeposit(
    id: string,
    payment: DepositPayment,
    now: Date,
  ): Promise<ConfirmDepositResult> {
    if (!docIdSchema.safeParse(id).success) {
      return Promise.resolve({ kind: "refund", booking: null });
    }
    return this.db.runTransaction(async (tx) => {
      const bookingRef = this.bookingsCol.doc(id);
      const snap = await tx.get(bookingRef);
      if (!snap.exists) return { kind: "refund", booking: null } as const;
      const booking = parseBooking(snap);

      if (booking.status !== "awaiting_deposit") {
        return booking.deposit?.paymentIntentId === payment.paymentIntentId
          ? ({ kind: "already", booking } as const)
          : ({ kind: "refund", booking } as const);
      }

      const dayRef = this.dayRef(booking.date);
      const [settingsSnap, weeklySnap, overrideSnap, ...daySnaps] =
        await tx.getAll(
          this.settingsRef,
          this.weeklyRef,
          this.overrideRef(booking.date),
          ...this.nearbyDayRefs(booking.date),
        );
      const settings = parseSettings(settingsSnap);
      const nowMs = now.getTime();
      // Normally the hold kept the time free. If it lapsed first (a very late
      // webhook), another booking may have taken it since. Chairs are those of
      // the booking's real date (close enough for a start after midnight).
      const others = daySnaps
        .flatMap(parseDayEntries)
        .filter(([otherId, entry]) => otherId !== id && blocksTime(entry, nowMs))
        .map(([, entry]) => entry);
      const { chairs } = dayRulesFor(
        booking.date,
        parseWeekly(weeklySnap),
        parseOverride(overrideSnap),
        settings,
      );
      const taken = !fitsAlongside(
        {
          startMs: Date.parse(booking.startUtc),
          endMs: Date.parse(booking.endUtc),
        },
        others,
        { chairs, bufferMin: settings.bufferMin, staggerMin: settings.staggerMin },
      );

      const updatedAt = now.toISOString();
      const deposit: BookingDeposit = {
        ...booking.deposit,
        amountPence: payment.amountPence,
        status: "paid",
        checkoutSessionId: payment.checkoutSessionId,
        paymentIntentId: payment.paymentIntentId,
        paidAt: updatedAt,
      };
      const status = taken ? "cancelled" : "confirmed";
      tx.update(bookingRef, {
        status,
        deposit,
        holdExpiresAt: FieldValue.delete(),
        updatedAt,
      });
      tx.set(
        dayRef,
        {
          bookings: {
            [id]: taken
              ? FieldValue.delete()
              : { status, holdExpiresAt: FieldValue.delete() },
          },
        },
        { merge: true },
      );
      const updated = stripUndefined<Booking>({
        ...booking,
        status,
        deposit,
        holdExpiresAt: undefined,
        updatedAt,
      });
      return taken
        ? ({ kind: "refund", booking: updated } as const)
        : ({ kind: "confirmed", booking: updated } as const);
    });
  }

  releaseHold(id: string, checkoutSessionId?: string) {
    if (!docIdSchema.safeParse(id).success) return Promise.resolve(null);
    return this.db.runTransaction(async (tx) => {
      const bookingRef = this.bookingsCol.doc(id);
      const snap = await tx.get(bookingRef);
      if (!snap.exists) return null;
      const booking = parseBooking(snap);
      if (booking.status !== "awaiting_deposit") return null;
      const sessionId = booking.deposit?.checkoutSessionId;
      if (checkoutSessionId && sessionId && sessionId !== checkoutSessionId) {
        return null;
      }
      tx.delete(bookingRef);
      tx.set(
        this.dayRef(booking.date),
        { bookings: { [id]: FieldValue.delete() } },
        { merge: true },
      );
      return booking;
    });
  }

  async updateDeposit(id: string, deposit: BookingDeposit, now: Date) {
    if (!docIdSchema.safeParse(id).success) return;
    await this.bookingsCol
      .doc(id)
      .update({ deposit: stripUndefined(deposit), updatedAt: now.toISOString() });
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

  // Equality only, so Firestore's automatic index covers it; callers sort.
  async listBookingsByMember(memberId: string) {
    const snap = await this.bookingsCol.where("memberId", "==", memberId).get();
    return snap.docs.map(parseBooking).filter(listed);
  }

  async countBookingsByMember() {
    // "!= null" matches only documents that have the field; select() keeps
    // the read to that one field.
    const snap = await this.bookingsCol
      .where("memberId", "!=", null)
      .select("memberId")
      .get();
    const counts = new Map<string, number>();
    for (const doc of snap.docs) {
      const memberId = doc.get("memberId");
      if (typeof memberId === "string") {
        counts.set(memberId, (counts.get(memberId) ?? 0) + 1);
      }
    }
    return counts;
  }

  async unlinkMember(memberId: string) {
    const snap = await this.bookingsCol.where("memberId", "==", memberId).get();
    // A batch takes at most 500 writes.
    for (let i = 0; i < snap.docs.length; i += 500) {
      const batch = this.db.batch();
      for (const doc of snap.docs.slice(i, i + 500)) {
        batch.update(doc.ref, { memberId: FieldValue.delete() });
      }
      await batch.commit();
    }
  }

  async listBookingsWithReferencePhotos() {
    // `!= null` matches documents that have the field (single-field index).
    const snap = await this.bookingsCol
      .where("referencePhotos", "!=", null)
      .get();
    return snap.docs.map(parseBooking);
  }

  async clearReferencePhotos(id: string) {
    await this.bookingsCol
      .doc(id)
      .update({ referencePhotos: FieldValue.delete() });
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

  async saveWeekly(weekly: WeeklySchedule) {
    await this.weeklyRef.set({
      ...weeklyHoursSchema.parse(weekly.hours),
      rules: stripUndefined(weeklyRulesSchema.parse(weekly.rules)),
    });
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

  saveCategory(
    category: ServiceCategory,
    mode: "create" | "update",
  ): Promise<SaveResult> {
    const { id, ...data } = serviceCategorySchema.parse(category);
    const ref = this.db.collection("serviceCategories").doc(id);
    return this.db.runTransaction(async (tx) => {
      const exists = (await tx.get(ref)).exists;
      if (mode === "create" && exists) return { ok: false, reason: "exists" };
      if (mode === "update" && !exists) {
        return { ok: false, reason: "not_found" };
      }
      tx.set(ref, data);
      return { ok: true };
    });
  }

  deleteCategory(id: string): Promise<DeleteCategoryResult> {
    if (!docIdSchema.safeParse(id).success) {
      return Promise.resolve({ ok: true });
    }
    return this.db.runTransaction(async (tx) => {
      const inUse = await tx.get(
        this.db.collection("services").where("categoryId", "==", id).limit(1),
      );
      if (!inUse.empty) return { ok: false, reason: "not_empty" };
      tx.delete(this.db.collection("serviceCategories").doc(id));
      return { ok: true };
    });
  }

  async deleteService(id: string) {
    if (!docIdSchema.safeParse(id).success) return;
    await this.db.collection("services").doc(id).delete();
  }
}
