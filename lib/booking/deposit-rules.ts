import { MINUTE_MS } from "./time";

// Deposit rules shared by the server and the booking form. Framework-free.

// Stripe's payment page lasts this long (Stripe's minimum is 30 minutes; one
// more absorbs clock drift).
export const CHECKOUT_MINUTES = 31;
// The time stays held a little longer than the payment page, so a payment
// made in the last seconds still finds it.
export const HOLD_MARGIN_MINUTES = 10;

// What an online booking pays up front: the deposit, never more than the
// appointment itself. 0 = no payment step.
export function depositFor(
  depositPence: number,
  service: { depositRequired: boolean },
  pricePence: number,
): number {
  if (!service.depositRequired || depositPence <= 0) return 0;
  return Math.min(depositPence, pricePence);
}

export function holdTimes(now: Date) {
  const checkoutExpiresMs = now.getTime() + CHECKOUT_MINUTES * MINUTE_MS;
  return {
    checkoutExpiresAt: Math.floor(checkoutExpiresMs / 1000),
    holdExpiresAt: new Date(
      checkoutExpiresMs + HOLD_MARGIN_MINUTES * MINUTE_MS,
    ).toISOString(),
  };
}
