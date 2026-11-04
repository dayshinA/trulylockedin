import { z } from "zod";

import { portfolioIdSchema, mediaSchema } from "@/lib/portfolio/schemas";
import { deliveryAddressSchema } from "./address";

export const productIdSchema = portfolioIdSchema;

export const productImageSchema = mediaSchema.extend({
  type: z.literal("image"),
});

export const productSchema = z.object({
  id: productIdSchema,
  name: z.string().trim().min(1).max(100),
  category: z.string().trim().max(60).default(""),
  description: z.string().trim().max(2000).default(""),
  pricePence: z.number().int().min(0).max(10_000_000),
  media: z.array(productImageSchema).max(12).default([]),
  coverPublicId: z.string().optional(),
  inStock: z.boolean().default(true),
  published: z.boolean().default(false),
  featured: z.boolean().default(false),
  order: z.number().int().min(0).max(9999).default(0),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const orderStatusSchema = z.enum([
  "pending",
  "ready",
  "collected",
  "cancelled",
]);

export const MAX_QUANTITY = 10;
export const MAX_ORDER_LINES = 20;

export const orderItemSchema = z.object({
  productId: productIdSchema,
  name: z.string().min(1).max(100),
  pricePence: z.number().int().min(0),
  quantity: z.number().int().min(1).max(MAX_QUANTITY),
});

export const orderSchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9_-]{1,100}$/),
  ref: z.string(),
  items: z.array(orderItemSchema).min(1).max(MAX_ORDER_LINES),
  totalPence: z.number().int().min(0),
  client: z.object({
    name: z.string(),
    phone: z.string(),
    email: z.string().optional(),
    notes: z.string().optional(),
  }),
  delivery: deliveryAddressSchema.optional(),
  status: orderStatusSchema,
  cancelTokenHash: z.string(),
  memberId: z.string().optional(),
  adminNotes: z.string().optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
