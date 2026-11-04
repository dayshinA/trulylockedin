import "server-only";

import { FirebaseAuthError } from "firebase-admin/auth";

import { bookingRepository } from "@/lib/booking/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { orderRepository } from "@/lib/shop/server";
import { deleteMemberDoc } from "./repository";

// Used by the member (account page) and the owner (admin). Bookings and
// orders are unlinked first and kept as guest ones, so if a later step fails
// a retry still finds the member. Signing the browser out is the caller's job.
export async function deleteMember(uid: string): Promise<void> {
  await Promise.all([
    bookingRepository().unlinkMember(uid),
    orderRepository().unlinkMember(uid),
  ]);
  await deleteMemberDoc(adminDb(), uid);
  try {
    await adminAuth().deleteUser(uid);
  } catch (error) {
    if (
      !(error instanceof FirebaseAuthError) ||
      error.code !== "auth/user-not-found"
    ) {
      throw error;
    }
  }
}
