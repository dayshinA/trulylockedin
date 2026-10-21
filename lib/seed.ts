import "server-only";

import type { Firestore } from "firebase-admin/firestore";

import {
  DEFAULT_BOOKING_SETTINGS,
  DEFAULT_WEEKLY_HOURS,
  SEED_SERVICES,
} from "@/lib/seed-data";

// Fills in whatever booking data is missing and never overwrites the owner's
// edits: settings fields are added only if absent, weekly hours only if the doc
// doesn't exist, and sample services only if there are no services at all.
// Returns what was written.
export function seedBookingData(db: Firestore): Promise<string[]> {
  const settingsRef = db.doc("settings/main");
  const weeklyRef = db.doc("availability/weekly");
  const services = db.collection("services");

  return db.runTransaction(async (tx) => {
    const [settingsSnap, weeklySnap] = await tx.getAll(settingsRef, weeklyRef);
    const anyService = await tx.get(services.limit(1));
    const written: string[] = [];

    const existing = settingsSnap.data() ?? {};
    const missing = Object.fromEntries(
      Object.entries(DEFAULT_BOOKING_SETTINGS).filter(
        ([key]) => !(key in existing),
      ),
    );
    if (Object.keys(missing).length > 0) {
      tx.set(settingsRef, missing, { merge: true });
      written.push(`settings/main (${Object.keys(missing).join(", ")})`);
    }

    if (!weeklySnap.exists) {
      tx.set(weeklyRef, DEFAULT_WEEKLY_HOURS);
      written.push("availability/weekly");
    }

    if (anyService.empty) {
      for (const { id, ...service } of SEED_SERVICES) {
        tx.create(services.doc(id), service);
      }
      written.push(`services (${SEED_SERVICES.length} samples)`);
    }

    return written;
  });
}

export async function isBookingConfigured(db: Firestore): Promise<boolean> {
  return (await db.doc("availability/weekly").get()).exists;
}
