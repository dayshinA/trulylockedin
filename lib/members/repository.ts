import "server-only";

import { FieldValue, type Firestore } from "firebase-admin/firestore";

import type { Member } from "@/types/member";
import { memberDocSchema, type ProfileForm } from "./schemas";

const COLLECTION = "members";

function toMember(uid: string, data: unknown): Member {
  return { uid, ...memberDocSchema.parse(data) };
}

export async function getMemberDoc(
  db: Firestore,
  uid: string,
): Promise<Member | null> {
  const snap = await db.collection(COLLECTION).doc(uid).get();
  return snap.exists ? toMember(uid, snap.data()) : null;
}

// Called on every member sign-in. Creates the document the first time and
// otherwise keeps the email in step with the Auth account. The name is only
// used on creation; afterwards the member edits it on /account/details.
// Newest first. A single-field order, so no composite index is needed.
export async function listMembers(db: Firestore): Promise<Member[]> {
  const snap = await db
    .collection(COLLECTION)
    .orderBy("createdAt", "desc")
    .get();
  return snap.docs.map((doc) => toMember(doc.id, doc.data()));
}

export async function ensureMember(
  db: Firestore,
  input: { uid: string; email: string; name: string },
): Promise<Member> {
  const ref = db.collection(COLLECTION).doc(input.uid);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const now = new Date().toISOString();

    if (!snap.exists) {
      const data = {
        name: input.name,
        email: input.email,
        createdAt: now,
        updatedAt: now,
      };
      tx.create(ref, data);
      return { uid: input.uid, ...data };
    }

    const existing = toMember(input.uid, snap.data());
    if (existing.email === input.email) return existing;
    tx.update(ref, { email: input.email, updatedAt: now });
    return { ...existing, email: input.email, updatedAt: now };
  });
}

export async function updateMemberProfile(
  db: Firestore,
  uid: string,
  profile: ProfileForm,
): Promise<void> {
  await db
    .collection(COLLECTION)
    .doc(uid)
    .update({
      name: profile.name,
      phone: profile.phone ?? FieldValue.delete(),
      updatedAt: new Date().toISOString(),
    });
}

// Remembered from the member's latest booking to prefill the next one.
export async function setMemberPhone(
  db: Firestore,
  uid: string,
  phone: string,
): Promise<void> {
  await db
    .collection(COLLECTION)
    .doc(uid)
    .update({ phone, updatedAt: new Date().toISOString() });
}

export async function deleteMemberDoc(db: Firestore, uid: string) {
  await db.collection(COLLECTION).doc(uid).delete();
}
