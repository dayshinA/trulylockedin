// The private manage token of a booking or order that's off paying on
// Stripe (keyed by its ref, TLI-… or TLO-…). The token must never be in a URL
// Stripe sees, so it waits in this tab's sessionStorage and the pages Stripe
// sends the customer back to pick it up.

export type BookingAccess = {
  token: string;
  photos: number;
  // True once the booking was paid or released; until then, coming back to
  // /book releases the hold so it doesn't block the client's own next try.
  settled?: boolean;
};

const PREFIX = "tli-booking:";

export function saveBookingAccess(ref: string, access: BookingAccess): void {
  try {
    sessionStorage.setItem(PREFIX + ref, JSON.stringify(access));
  } catch {
    // Private mode or storage blocked: the confirmation email still has
    // Find my booking.
  }
}

export function readBookingAccess(ref: string): BookingAccess | null {
  try {
    const raw = sessionStorage.getItem(PREFIX + ref);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<BookingAccess>;
    return typeof value.token === "string"
      ? {
          token: value.token,
          photos: Number(value.photos) || 0,
          settled: value.settled === true,
        }
      : null;
  } catch {
    return null;
  }
}

export function settleBookingAccess(ref: string): void {
  const access = readBookingAccess(ref);
  if (access) saveBookingAccess(ref, { ...access, settled: true });
}

// Bookings ("TLI-") or orders ("TLO-") this tab sent to Stripe that haven't
// been paid or released.
export function unsettledBookings(
  refPrefix: "TLI-" | "TLO-",
): { ref: string; token: string }[] {
  try {
    return Object.keys(sessionStorage)
      .filter((key) => key.startsWith(PREFIX))
      .map((key) => key.slice(PREFIX.length))
      .filter((ref) => ref.startsWith(refPrefix))
      .flatMap((ref) => {
        const access = readBookingAccess(ref);
        return access && !access.settled ? [{ ref, token: access.token }] : [];
      });
  } catch {
    return [];
  }
}
