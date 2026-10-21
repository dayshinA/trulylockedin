import type { Product } from "@/types/shop";

export type ProductSaveResult =
  | { ok: true; previous: Product | null }
  | { ok: false; reason: "exists" | "not_found" };

// Storage seam for the shop, like PortfolioRepository for the gallery.
export interface ProductRepository {
  // Ordered by `order`, then name.
  list(options?: { publishedOnly?: boolean }): Promise<Product[]>;
  get(id: string): Promise<Product | null>;
  // Returns the previous version on update so removed photos can be cleaned up.
  save(product: Product, mode: "create" | "update"): Promise<ProductSaveResult>;
  // Returns what was deleted (its photos still need removing from Cloudinary).
  delete(id: string): Promise<Product | null>;
}

export function sortProducts(products: Product[]): Product[] {
  return products.sort(
    (a, b) => a.order - b.order || a.name.localeCompare(b.name, "en-GB"),
  );
}
