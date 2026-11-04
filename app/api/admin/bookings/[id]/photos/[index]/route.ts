import { getAdmin } from "@/lib/auth/dal";
import { docIdSchema } from "@/lib/booking/schemas";
import { bookingRepository } from "@/lib/booking/server";
import { referencePhotoUrl } from "@/lib/cloudinary";

const WIDTHS = { thumb: 480, full: 1600 } as const;

// Serves a client's reference photo to the signed-in owner. The Cloudinary
// asset is "authenticated" and its signed URL never expires, so the URL stays
// on the server and the browser only ever sees this admin-only route.
// ?size=thumb|full (default full).
export async function GET(
  request: Request,
  ctx: RouteContext<"/api/admin/bookings/[id]/photos/[index]">,
) {
  if (!(await getAdmin())) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { id, index } = await ctx.params;
  const position = Number(index);
  if (!docIdSchema.safeParse(id).success || !Number.isInteger(position)) {
    return new Response("Not found", { status: 404 });
  }
  const booking = await bookingRepository().getBooking(id);
  const publicId = booking?.referencePhotos?.[position];
  if (!publicId) return new Response("Not found", { status: 404 });

  const size =
    new URL(request.url).searchParams.get("size") === "thumb"
      ? "thumb"
      : "full";
  const upstream = await fetch(referencePhotoUrl(publicId, WIDTHS[size]), {
    // f_auto picks the format from what the browser says it accepts.
    headers: { Accept: request.headers.get("accept") ?? "image/*" },
  });
  if (!upstream.ok || !upstream.body) {
    return new Response("Photo unavailable", { status: 502 });
  }
  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "private, max-age=3600",
      Vary: "Accept",
      "X-Robots-Tag": "noindex",
    },
  });
}
