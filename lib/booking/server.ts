import "server-only";

import { adminDb } from "@/lib/firebase/admin";
import { FirestoreBookingRepository } from "./firestore-repository";
import type { BookingRepository } from "./repository";

let repository: BookingRepository | undefined;

// The production repository. Server Actions import this.
export function bookingRepository(): BookingRepository {
  repository ??= new FirestoreBookingRepository(adminDb());
  return repository;
}
