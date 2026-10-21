import type { PortfolioItem } from "@/types/portfolio";

export type PortfolioSaveResult =
  | { ok: true; previous: PortfolioItem | null }
  | { ok: false; reason: "exists" | "not_found" };

// Storage seam for the portfolio, like BookingRepository for bookings.
export interface PortfolioRepository {
  // Ordered by `order`, newest first within the same order.
  list(options?: { publishedOnly?: boolean }): Promise<PortfolioItem[]>;
  get(id: string): Promise<PortfolioItem | null>;
  // Returns the previous version on update so removed media can be cleaned up.
  save(
    item: PortfolioItem,
    mode: "create" | "update",
  ): Promise<PortfolioSaveResult>;
  // Returns what was deleted (its media still needs removing from Cloudinary).
  delete(id: string): Promise<PortfolioItem | null>;
}
