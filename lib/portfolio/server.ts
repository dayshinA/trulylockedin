import "server-only";

import { adminDb } from "@/lib/firebase/admin";
import { FirestorePortfolioRepository } from "./firestore-repository";
import type { PortfolioRepository } from "./repository";

let repository: PortfolioRepository | undefined;

export function portfolioRepository(): PortfolioRepository {
  repository ??= new FirestorePortfolioRepository(adminDb());
  return repository;
}
