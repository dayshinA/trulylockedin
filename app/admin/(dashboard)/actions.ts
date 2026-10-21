"use server";

import { refresh, updateTag } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SESSION_COOKIE } from "@/lib/auth/constants";
import { verifyAdmin } from "@/lib/auth/dal";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { PUBLIC_TAGS } from "@/lib/data/public";
import { seedBookingData } from "@/lib/seed";

// Writes default booking rules, opening hours and sample services where missing.
export async function seedBookingDataAction() {
  await verifyAdmin();
  const written = await seedBookingData(adminDb());
  console.log("Seeded booking data:", written.join("; ") || "nothing missing");
  updateTag(PUBLIC_TAGS.services);
  updateTag(PUBLIC_TAGS.hours);
  refresh();
}

export async function signOut() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE)?.value;
  cookieStore.delete(SESSION_COOKIE);

  if (sessionCookie) {
    try {
      // Revoking invalidates this session cookie everywhere, not just in this browser.
      const { uid } = await adminAuth().verifySessionCookie(sessionCookie);
      await adminAuth().revokeRefreshTokens(uid);
    } catch {
      // Already invalid or expired; the cookie is gone either way.
    }
  }

  redirect("/admin/login");
}
