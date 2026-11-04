import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { verifyAdmin } from "@/lib/auth/dal";
import { bookingRepository } from "@/lib/booking/server";
import { todayLocal } from "@/lib/booking/time";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { formatLocalDate } from "@/lib/format";
import { joinedOn } from "@/lib/members/dates";
import { getMemberDoc } from "@/lib/members/repository";
import { memberUidSchema } from "@/lib/members/schemas";
import { orderRepository } from "@/lib/shop/server";
import {
  dangerButton,
  DangerZone,
  DetailList,
  outlineButton,
  PageHeader,
  primaryButton,
  Section,
} from "../../_components/admin-ui";
import { BookingsByDate } from "../../bookings/booking-list";
import { OrderRows } from "../../orders/order-list";
import { deleteMemberAction } from "../actions";

export const metadata: Metadata = {
  title: "Member",
};

const PROVIDER_LABELS: Record<string, string> = {
  password: "Email and password",
  "google.com": "Google",
};

export default async function MemberPage({
  params,
}: PageProps<"/admin/members/[uid]">) {
  await verifyAdmin();
  const uid = memberUidSchema.safeParse((await params).uid);
  if (!uid.success) notFound();

  const repo = bookingRepository();
  const [member, bookings, orders, settings, signInMethods] =
    await Promise.all([
      getMemberDoc(adminDb(), uid.data),
      repo.listBookingsByMember(uid.data),
      orderRepository().listOrdersByMember(uid.data),
      repo.getSettings(),
      signInMethodsOf(uid.data),
    ]);
  if (!member) notFound();

  const newestFirst = bookings.toSorted((a, b) =>
    b.startUtc.localeCompare(a.startUtc),
  );

  return (
    <div className="flex max-w-2xl flex-col gap-10">
      <PageHeader
        back={{ href: "/admin/members", label: "All members" }}
        eyebrow={`Member since ${formatLocalDate(joinedOn(member), "long")}`}
        title={member.name}
      />

      <div className="flex flex-wrap gap-3">
        {member.phone && (
          <a href={`tel:${member.phone}`} className={primaryButton}>
            Call {member.phone}
          </a>
        )}
        <a href={`mailto:${member.email}`} className={outlineButton}>
          Email
        </a>
      </div>

      <DetailList
        rows={[
          ["Email", member.email],
          ["Phone", member.phone ?? "—"],
          ["Signs in with", signInMethods ?? "—"],
        ]}
      />

      <Section title="Bookings" count={bookings.length}>
        <BookingsByDate
          bookings={newestFirst}
          today={todayLocal(new Date(), settings.timezone)}
          empty="No bookings made while signed in."
        />
      </Section>

      <Section title="Orders" count={orders.length}>
        <OrderRows orders={orders} empty="No orders placed while signed in." />
      </Section>

      <DangerZone summary="Delete this member">
        <p className="text-muted">
          This deletes their account and signs them out. Their bookings and
          orders stay, as guest ones.
        </p>
        <form action={deleteMemberAction}>
          <input type="hidden" name="uid" value={member.uid} />
          <button type="submit" className={dangerButton}>
            Delete member
          </button>
        </form>
      </DangerZone>
    </div>
  );
}

// "Google, Email and password". Null if the Auth record can't be read.
async function signInMethodsOf(uid: string): Promise<string | null> {
  try {
    const user = await adminAuth().getUser(uid);
    const labels = user.providerData.map(
      (p) => PROVIDER_LABELS[p.providerId] ?? p.providerId,
    );
    return labels.length > 0 ? labels.join(", ") : null;
  } catch {
    return null;
  }
}
