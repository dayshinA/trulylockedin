"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";

import { SESSION_COOKIE } from "@/lib/auth/constants";
import { verifyAdmin } from "@/lib/auth/dal";
import { endSession } from "@/lib/auth/session";
import { adminDb } from "@/lib/firebase/admin";
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
  await endSession(SESSION_COOKIE);
  redirect("/admin/login");
}
