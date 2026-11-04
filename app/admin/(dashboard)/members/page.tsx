import type { Metadata } from "next";
import Link from "next/link";

import { verifyAdmin } from "@/lib/auth/dal";
import { bookingRepository } from "@/lib/booking/server";
import { orderRepository } from "@/lib/shop/server";
import { adminDb } from "@/lib/firebase/admin";
import { formatLocalDate } from "@/lib/format";
import { listMembers } from "@/lib/members/repository";
import { joinedOn } from "@/lib/members/dates";
import {
  PageHeader,
  rowLink,
  rowList,
  rowTitle,
} from "../_components/admin-ui";

export const metadata: Metadata = {
  title: "Members",
};

export default async function MembersPage() {
  await verifyAdmin();
  const [members, bookingCounts, orderCounts] = await Promise.all([
    listMembers(adminDb()),
    bookingRepository().countBookingsByMember(),
    orderRepository().countOrdersByMember(),
  ]);

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <PageHeader title="Members">
        Clients who signed up for an account, newest first. Guests who book
        without one aren&rsquo;t listed here.
      </PageHeader>

      {members.length === 0 ? (
        <p className="text-muted">No members yet.</p>
      ) : (
        <ul className={rowList}>
          {members.map((member) => {
            const bookings = bookingCounts.get(member.uid) ?? 0;
            const orders = orderCounts.get(member.uid) ?? 0;
            return (
              <li key={member.uid}>
                <Link
                  href={`/admin/members/${member.uid}`}
                  className={rowLink}
                >
                  <span className="min-w-0 flex-1">
                    <span className={rowTitle}>{member.name}</span>
                    <span className="block truncate text-sm text-muted">
                      {member.email}
                      {member.phone && ` · ${member.phone}`}
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-sm">
                    <span className="block text-brand tabular-nums">
                      {plural(bookings, "booking")} · {plural(orders, "order")}
                    </span>
                    <span className="block text-muted">
                      Joined {formatLocalDate(joinedOn(member), "short")}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

const plural = (count: number, noun: string) =>
  `${count} ${noun}${count === 1 ? "" : "s"}`;
