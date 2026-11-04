import { utcMsToLocal } from "@/lib/booking/time";
import { TIMEZONE } from "@/lib/site";
import type { LocalDate } from "@/types/booking";
import type { Member } from "@/types/member";

// The salon-local date of an ISO timestamp (e.g. createdAt).
export function localDateOf(iso: string): LocalDate {
  return utcMsToLocal(Date.parse(iso), TIMEZONE).date;
}

// The salon-local date the member signed up.
export function joinedOn(member: Pick<Member, "createdAt">): LocalDate {
  return localDateOf(member.createdAt);
}
