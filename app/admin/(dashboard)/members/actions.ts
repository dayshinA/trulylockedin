"use server";

import { redirect } from "next/navigation";

import { verifyAdmin } from "@/lib/auth/dal";
import { deleteMember } from "@/lib/members/delete";
import { memberUidSchema } from "@/lib/members/schemas";

// Removes the account and its sign-in. Their bookings stay as guest bookings,
// and the member is signed out because their session cookie stops verifying.
export async function deleteMemberAction(formData: FormData) {
  await verifyAdmin();
  const uid = memberUidSchema.safeParse(formData.get("uid"));
  if (uid.success) await deleteMember(uid.data);
  redirect("/admin/members");
}
