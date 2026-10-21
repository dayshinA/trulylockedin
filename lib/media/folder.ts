import { z } from "zod";

// Every upload (portfolio and service photos) goes through the one signed
// preset, which fixes this folder. Must match the preset (see CLAUDE.md).
export const MEDIA_FOLDER = "truly-lockedin/portfolio";

// Only assets in our own folder can be attached, and therefore deleted.
export const mediaPublicIdSchema = z
  .string()
  .startsWith(`${MEDIA_FOLDER}/`)
  .regex(/^[\w\-/.]+$/)
  .max(200);

export type MediaRef = { publicId: string; type: "image" | "video" };
