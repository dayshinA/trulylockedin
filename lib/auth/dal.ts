import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";

import { adminAuth } from "@/lib/firebase/admin";
import { SESSION_COOKIE } from "./constants";

export type Admin = {
  uid: string;
  email: string | null;
};

// Deduped per request. Verifies the signature, expiry and revocation (checkRevoked),
// then requires the `admin` custom claim set by scripts/set-admin.mts.
export const getAdmin = cache(async (): Promise<Admin | null> => {
  const sessionCookie = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!sessionCookie) return null;

  // verifySessionCookie checks expiry against Date.now() and revocation over the
  // network, so it must run at request time, not during a (runtime) prerender.
  await connection();

  try {
    const claims = await adminAuth().verifySessionCookie(sessionCookie, true);
    if (claims.admin !== true) return null;
    return { uid: claims.uid, email: claims.email ?? null };
  } catch {
    return null;
  }
});

// Call at the top of every admin page and every admin Server Action.
export async function verifyAdmin(): Promise<Admin> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
