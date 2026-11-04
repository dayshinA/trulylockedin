import { z } from "zod";

// Photos a client attaches to an online booking ("this is the look I want").
// They go through their own signed preset (CLOUDINARY_REFERENCE_PRESET) with
// authenticated delivery, so they can only be viewed through the admin
// (app/api/admin/bookings/[id]/photos/[index]/route.ts). Must match the preset.
export const REFERENCE_FOLDER = "truly-lockedin/references";

export const MAX_REFERENCE_PHOTOS = 3;

// Photos are deleted this many days after the appointment date, or once the
// booking is cancelled (lib/booking/reference-cleanup.ts).
export const REFERENCE_RETENTION_DAYS = 30;

// Only uploads from the reference preset can be attached to a booking.
export const referencePhotoIdSchema = z
  .string()
  .startsWith(`${REFERENCE_FOLDER}/`)
  .regex(/^[\w\-/.]+$/)
  .max(200);

export const referencePhotosSchema = z
  .array(referencePhotoIdSchema)
  .max(MAX_REFERENCE_PHOTOS, `Add up to ${MAX_REFERENCE_PHOTOS} photos`)
  .default([])
  .transform((ids) => [...new Set(ids)]);
