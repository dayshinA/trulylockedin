import { z } from "zod";

import { MEDIA_FOLDER, mediaPublicIdSchema } from "@/lib/media/folder";

export const PORTFOLIO_FOLDER = MEDIA_FOLDER;

export const portfolioIdSchema = z
  .string()
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use lowercase letters, numbers and dashes",
  )
  .max(80);

export const mediaSchema = z.object({
  publicId: mediaPublicIdSchema,
  type: z.enum(["image", "video"]),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  alt: z.string().trim().max(200).default(""),
});

export const portfolioItemSchema = z.object({
  id: portfolioIdSchema,
  title: z.string().trim().min(1).max(100),
  category: z.string().trim().max(60).default(""),
  description: z.string().trim().max(2000).default(""),
  media: z.array(mediaSchema).max(30).default([]),
  coverPublicId: z.string().optional(),
  featured: z.boolean().default(false),
  published: z.boolean().default(false),
  order: z.number().int().min(0).max(9999).default(0),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
