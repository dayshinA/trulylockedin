import { clientKey } from "@/lib/client-key";
import { referencePreset, signUpload } from "@/lib/cloudinary";
import { checkUpload, uploadFileSchema } from "@/lib/media/limits";
import { createRateLimiter } from "@/lib/rate-limit";

// Per-process; see lib/rate-limit.ts. Room for a few photos plus retries.
const limiter = createRateLimiter({
  name: "reference-photo",
  limit: 15,
  windowMs: 10 * 60_000,
});

// Signs one reference photo upload from the public booking form. No sign-in:
// the preset only accepts photos, stores them privately in their own folder,
// and photos never attached to a booking are deleted after a day
// (lib/booking/reference-cleanup.ts).
export async function POST(request: Request) {
  if (!(await limiter.hit(await clientKey()))) {
    return Response.json(
      { error: "Too many uploads. Please try again in a few minutes." },
      { status: 429 },
    );
  }
  const file = uploadFileSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!file.success) {
    return Response.json({ error: "Invalid upload request" }, { status: 400 });
  }
  const check = checkUpload(file.data, false);
  if (!check.ok) {
    return Response.json({ error: check.message }, { status: 400 });
  }
  return Response.json(signUpload("image", referencePreset()));
}
