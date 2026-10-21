import "server-only";

import type { DocumentSnapshot, Firestore } from "firebase-admin/firestore";

import type { PortfolioItem } from "@/types/portfolio";
import { sortPortfolio } from "./media";
import type { PortfolioRepository, PortfolioSaveResult } from "./repository";
import { portfolioIdSchema, portfolioItemSchema } from "./schemas";

// portfolio/{id}: PortfolioItem without id.

const stripUndefined = <T>(value: T): T => JSON.parse(JSON.stringify(value));

function parse(snap: DocumentSnapshot): PortfolioItem {
  return portfolioItemSchema.parse({ ...snap.data(), id: snap.id });
}

export class FirestorePortfolioRepository implements PortfolioRepository {
  constructor(private readonly db: Firestore) {}

  private get col() {
    return this.db.collection("portfolio");
  }

  async list({ publishedOnly = false } = {}) {
    const query = publishedOnly
      ? this.col.where("published", "==", true)
      : this.col;
    return sortPortfolio((await query.get()).docs.map(parse));
  }

  async get(id: string) {
    if (!portfolioIdSchema.safeParse(id).success) return null;
    const snap = await this.col.doc(id).get();
    return snap.exists ? parse(snap) : null;
  }

  save(
    item: PortfolioItem,
    mode: "create" | "update",
  ): Promise<PortfolioSaveResult> {
    const { id, ...data } = portfolioItemSchema.parse(item);
    const ref = this.col.doc(id);
    return this.db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (mode === "create" && snap.exists)
        return { ok: false, reason: "exists" };
      if (mode === "update" && !snap.exists) {
        return { ok: false, reason: "not_found" };
      }
      tx.set(ref, stripUndefined(data));
      return { ok: true, previous: snap.exists ? parse(snap) : null };
    });
  }

  delete(id: string): Promise<PortfolioItem | null> {
    if (!portfolioIdSchema.safeParse(id).success) return Promise.resolve(null);
    const ref = this.col.doc(id);
    return this.db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) return null;
      tx.delete(ref);
      return parse(snap);
    });
  }
}
