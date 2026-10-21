// Grants (or revokes) the `admin` custom claim for a Firebase Auth user.
// Usage: node --env-file=.env.local scripts/set-admin.mts <uid> [--revoke]
// The user must sign out and back in for the new claim to reach their ID token.
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const [uid, flag] = process.argv.slice(2);
if (!uid) {
  console.error(
    "Usage: node --env-file=.env.local scripts/set-admin.mts <uid> [--revoke]",
  );
  process.exit(1);
}

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

const auth = getAuth();
const user = await auth.getUser(uid);
const revoke = flag === "--revoke";

// Merge so other claims (if any are added later) survive.
const claims = { ...user.customClaims, admin: !revoke };
await auth.setCustomUserClaims(uid, claims);
// Force existing sessions to pick up the change.
await auth.revokeRefreshTokens(uid);

console.log(
  `${revoke ? "Revoked" : "Granted"} admin for ${user.email ?? uid}`,
  claims,
);
