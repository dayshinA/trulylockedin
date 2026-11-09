"use server";

import { refresh, updateTag } from "next/cache";

import { verifyAdmin } from "@/lib/auth/dal";
import { PUBLIC_TAGS } from "@/lib/data/public";
import { adminDb } from "@/lib/firebase/admin";
import { deleteConnection } from "@/lib/tiktok/store";

export type TikTokActionResult = { status: "ok" } | { status: "error"; message: string };

// Forgets the account (and revokes the token at TikTok); the videos leave the
// website straight away.
export async function disconnectTikTokAction(): Promise<TikTokActionResult> {
  await verifyAdmin();
  try {
    await deleteConnection(adminDb());
  } catch (error) {
    console.error("TikTok disconnect failed", error);
    return { status: "error", message: "Couldn't disconnect. Please try again." };
  }
  updateTag(PUBLIC_TAGS.tiktok);
  refresh();
  return { status: "ok" };
}

// The website refreshes the videos every hour by itself; this is for a new
// post the owner wants to show now.
export async function refreshTikTokAction(): Promise<TikTokActionResult> {
  await verifyAdmin();
  updateTag(PUBLIC_TAGS.tiktok);
  refresh();
  return { status: "ok" };
}
