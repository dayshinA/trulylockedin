import type { PortfolioMedia } from "./portfolio";

// products/{id} — something the salon sells. The id doubles as the URL slug
// (/shop/{id}) and never changes after creation. Customers order online and
// pay when they collect in the salon.

// Photos only; same shape as portfolio media so the viewer can be shared.
export type ProductImage = PortfolioMedia & { type: "image" };

export type Product = {
  id: string;
  name: string;
  // Free text, used for the /shop filter, e.g. "Oils".
  category: string;
  description: string;
  pricePence: number;
  // Display order; the first photo is the cover unless coverPublicId is set.
  media: ProductImage[];
  coverPublicId?: string;
  // Out of stock: still shown, but can't be ordered.
  inStock: boolean;
  published: boolean;
  featured: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
};

// orders/{id} — a click-and-collect order, paid in the salon on collection.
//   pending → ready → collected; pending | ready → cancelled.
export type OrderStatus = "pending" | "ready" | "collected" | "cancelled";

// Copied from the product when ordered, so later edits don't change the order.
export type OrderItem = {
  productId: string;
  name: string;
  pricePence: number;
  quantity: number;
};

export type OrderClient = {
  name: string;
  // E.164, e.g. "+447700900123".
  phone: string;
  email?: string;
  notes?: string;
};

export type Order = {
  id: string;
  // Short code for the customer, e.g. "TLO-7KQ2M9XA".
  ref: string;
  items: OrderItem[];
  totalPence: number;
  client: OrderClient;
  status: OrderStatus;
  // sha256 of the token in the customer's private order link.
  cancelTokenHash: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
};
