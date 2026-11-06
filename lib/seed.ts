import "server-only";

import type { Firestore } from "firebase-admin/firestore";

import { seedCatalogue } from "@/lib/booking/seed-catalogue";
import {
  DEFAULT_BOOKING_SETTINGS,
  DEFAULT_DAY_RULES,
  DEFAULT_WEEKLY_HOURS,
} from "@/lib/seed-data";

// Fills in whatever booking data is missing and never overwrites the owner's
// edits: settings fields are added only if absent, weekly hours only if the doc
// doesn't exist, and the service catalogue only if there are no services at all.
// Returns what was written.
export async function seedBookingData(db: Firestore): Promise<string[]> {
  const settingsRef = db.doc("settings/main");
  const weeklyRef = db.doc("availability/weekly");

  const written = await db.runTransaction(async (tx) => {
    const [settingsSnap, weeklySnap] = await tx.getAll(settingsRef, weeklyRef);
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
      tx.set(weeklyRef, { ...DEFAULT_WEEKLY_HOURS, rules: DEFAULT_DAY_RULES });
      written.push("availability/weekly");
    }

    return written;
  });

  if ((await db.collection("services").limit(1).get()).empty) {
    const { services } = await seedCatalogue(db);
    written.push(`services (${services.length})`);
  }
  return written;
}

export async function isBookingConfigured(db: Firestore): Promise<boolean> {
  return (await db.doc("availability/weekly").get()).exists;
}
