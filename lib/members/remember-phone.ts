import "server-only";

import { normalizePhone } from "@/lib/booking/request";
import { adminDb } from "@/lib/firebase/admin";
import type { Member } from "@/types/member";
import { setMemberPhone } from "./repository";

// After a member's booking or order succeeds, keep the phone they used to
// prefill the next form. Failures are logged: the booking/order still stands.
export async function rememberMemberPhone(
  member: Pick<Member, "uid" | "phone">,
  rawPhone: unknown,
): Promise<void> {
  const phone = normalizePhone(String(rawPhone ?? ""));
  if (!phone || phone === member.phone) return;
  try {
    await setMemberPhone(adminDb(), member.uid, phone);
  } catch (error) {
    console.error("Saving the member's phone failed", error);
  }
}
