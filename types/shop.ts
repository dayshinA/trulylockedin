import type { PortfolioMedia } from "./portfolio";

// products/{id} — something the salon sells. The id doubles as the URL slug
// (/shop/{id}) and never changes after creation. Customers order online and
// either collect in the salon or have it posted to a UK address.

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

// orders/{id} — an order to collect in the salon, or to post (`delivery`).
//   (awaiting_payment →) pending → ready → collected; pending | ready → cancelled.
// For a delivery, "ready" means posted and "collected" means delivered; the
// labels in lib/shop/orders.ts say so.
// awaiting_payment: sent to Stripe to pay and not paid yet. Hidden from every
// list, and deleted if the payment page expires or is abandoned.
export type OrderStatus =
  | "awaiting_payment"
  | "pending"
  | "ready"
  | "collected"
  | "cancelled";

// Delivery is always paid online; collection can be paid online or in the
// salon.
export type PaymentMethod = "online" | "in_store";

export type OrderPaymentStatus =
  | "awaiting"
  | "paid"
  | "refunded"
  | "refund_failed";

// An online (Stripe) payment. Orders paid in the salon have none.
export type OrderPayment = {
  amountPence: number;
  status: OrderPaymentStatus;
  checkoutSessionId?: string;
  paymentIntentId?: string;
  paidAt?: string;
  refundId?: string;
  refundedAt?: string;
};

// A UK postal address. The postcode is stored upper-case with one space.
export type DeliveryAddress = {
  line1: string;
  line2?: string;
  city: string;
  postcode: string;
};

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
  // Where to post it. Missing means the customer collects in the salon, which
  // is also what every order placed before delivery existed means.
  delivery?: DeliveryAddress;
  // Missing on orders before online payment: paid in the salon.
  paymentMethod?: PaymentMethod;
  payment?: OrderPayment;
  status: OrderStatus;
  // sha256 of the token in the customer's private order link.
  cancelTokenHash: string;
  // Set when a signed-in member placed the order (members/{uid}). Only ever
  // taken from the session on the server, never from form data.
  memberId?: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
};
