import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { primaryButtonClass } from "@/components/site/form-field";
import { MemberAuth } from "@/components/site/member-auth";
import { getMember } from "@/lib/auth/member-dal";
import { loadMemberBookings } from "@/lib/booking/member-bookings";
import { bookingRepository } from "@/lib/booking/server";
import { getPublishedProducts } from "@/lib/data/public";
import { loadMemberOrders } from "@/lib/shop/member-orders";
import { orderRepository } from "@/lib/shop/server";
import type { Member } from "@/types/member";
import { AccountSection } from "./account-section";
import { BookingRow } from "./member-bookings";
import { OrderRow } from "./member-orders";
import { SignOutButton } from "./sign-out-button";

export const metadata: Metadata = {
  title: "Your account",
  robots: { index: false, follow: false },
};

export default function AccountPage({ searchParams }: PageProps<"/account">) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pt-28 pb-20 sm:px-6 sm:pt-36">
      <h1 className="font-display text-5xl leading-[1.05] font-semibold sm:text-6xl">
        Your account
      </h1>
      <Suspense fallback={<p className="mt-8 text-muted">Loading…</p>}>
        <AccountLoader searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function AccountLoader({
  searchParams,
}: {
  searchParams: PageProps<"/account">["searchParams"];
}) {
  const member = await getMember();
  if (member) return <SignedIn member={member} />;

  const { deleted } = await searchParams;
  return (
    <div className="mt-8 flex flex-col gap-10">
      {deleted === "1" && (
        <p role="status" className="border-l-2 border-brand pl-4 text-ink">
          Your account has been deleted.
        </p>
      )}
      <p className="text-lg text-muted">
        Sign in to see your bookings and book again in a tap. You can still{" "}
        <Link
          href="/book"
          className="text-brand underline underline-offset-4 hover:text-brand-hover"
        >
          book as a guest
        </Link>{" "}
        without an account.
      </p>
      <div className="border-t border-line pt-8">
        <MemberAuth />
      </div>
    </div>
  );
}

async function SignedIn({ member }: { member: Member }) {
  const firstName = member.name.split(/\s+/)[0];
  const now = new Date();
  const [bookings, orders] = await Promise.all([
    orNull(
      loadMemberBookings(bookingRepository(), member.uid, now),
      "bookings",
    ),
    orNull(
      getPublishedProducts().then((products) =>
        loadMemberOrders(orderRepository(), products, member.uid),
      ),
      "orders",
    ),
  ]);

  return (
    <div className="mt-8 flex flex-col gap-10">
      <p className="text-lg text-muted">
        Hello, {firstName}. You&rsquo;re signed in as{" "}
        <span className="text-ink">{member.email}</span>.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link
          href="/book"
          className={`${primaryButtonClass} inline-flex items-center justify-center`}
        >
          Book an appointment
        </Link>
        <Link
          href="/account/details"
          className="inline-flex min-h-12 items-center justify-center rounded-full border border-field px-8 font-semibold text-ink transition-colors hover:border-brand"
        >
          Your details
        </Link>
      </div>

      {bookings ? (
        <AccountSection
          title="Upcoming appointments"
          isEmpty={bookings.upcoming.length === 0}
          empty="No upcoming appointments."
        >
          {bookings.upcoming.map((booking) => (
            <BookingRow key={booking.id} booking={booking} />
          ))}
        </AccountSection>
      ) : (
        <LoadFailed what="appointments" />
      )}

      {!orders ? (
        <LoadFailed what="orders" />
      ) : (
        orders.open.length > 0 && (
          <AccountSection title="Current orders" isEmpty={false} empty={null}>
            {orders.open.map((order) => (
              <OrderRow key={order.id} order={order} />
            ))}
          </AccountSection>
        )
      )}

      {bookings && bookings.past.length > 0 && (
        <AccountSection title="Past appointments" isEmpty={false} empty={null}>
          {bookings.past.map((booking) => (
            <BookingRow key={booking.id} booking={booking} bookAgain />
          ))}
        </AccountSection>
      )}

      {orders && orders.past.length > 0 && (
        <AccountSection title="Past orders" isEmpty={false} empty={null}>
          {orders.past.map((order) => (
            <OrderRow key={order.id} order={order} orderAgain />
          ))}
        </AccountSection>
      )}

      <p className="text-sm text-muted">
        Bookings and orders made before signing in, or as a guest,
        aren&rsquo;t shown here. Use the link you were given at the time.
      </p>
      <div className="border-t border-line pt-6">
        <SignOutButton />
      </div>
    </div>
  );
}

// One list failing to load shouldn't hide the other.
async function orNull<T>(promise: Promise<T>, what: string): Promise<T | null> {
  try {
    return await promise;
  } catch (error) {
    console.error(`Loading the member's ${what} failed`, error);
    return null;
  }
}

function LoadFailed({ what }: { what: string }) {
  return (
    <p className="text-muted">
      We couldn&rsquo;t load your {what} just now. Please try again later.
    </p>
  );
}
