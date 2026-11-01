// Writes the salon's service catalogue to Firestore and replaces the old sample
// services. Prints the plan unless --apply is passed. Safe to re-run: services and
// categories that already exist are left exactly as they are.
// Usage: pnpm seed:services [--apply]
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

import { seedCatalogue } from "../lib/booking/seed-catalogue.ts";

const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } =
  process.env;
if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
  console.error("Missing FIREBASE_* env vars — run with --env-file=.env.local");
  process.exit(1);
}

initializeApp({
  credential: cert({
    projectId: FIREBASE_PROJECT_ID,
    clientEmail: FIREBASE_CLIENT_EMAIL,
    privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
});

const apply = process.argv.includes("--apply");
const { categories, services, removed } = await seedCatalogue(getFirestore(), {
  dryRun: !apply,
});

console.log(apply ? "Written:" : "Dry run, nothing written. Would write:");
console.log(`  categories (${categories.length}): ${categories.join(", ")}`);
console.log(`  services (${services.length}): ${services.join(", ")}`);
console.log(`  old samples removed (${removed.length}): ${removed.join(", ")}`);
if (!apply) console.log("Run again with --apply to write this.");
