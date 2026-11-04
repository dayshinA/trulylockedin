import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";

import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { getMemberDoc } from "@/lib/members/repository";
import type { Member } from "@/types/member";
import { MEMBER_SESSION_COOKIE } from "./constants";

// Deduped per request. Verifies the member session cookie (signature, expiry,
// revocation) and loads members/{uid}. The owner's admin account is never a
// member, even if it somehow holds a member cookie.
export const getMember = cache(async (): Promise<Member | null> => {
  const sessionCookie = (await cookies()).get(MEMBER_SESSION_COOKIE)?.value;
  if (!sessionCookie) return null;

  // verifySessionCookie reads Date.now() and calls the network: request time only.
  await connection();

  try {
    const claims = await adminAuth().verifySessionCookie(sessionCookie, true);
    if (claims.admin === true) return null;
    return await getMemberDoc(adminDb(), claims.uid);
  } catch {
    return null;
  }
});

// For member-only pages and actions.
export async function requireMember(): Promise<Member> {
  const member = await getMember();
  if (!member) redirect("/account");
  return member;
}
