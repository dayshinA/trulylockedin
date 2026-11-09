import { NextResponse, type NextRequest } from "next/server";

import { getAdmin } from "@/lib/auth/dal";
import { authorizeUrl, tiktokCredentials } from "@/lib/tiktok/api";
import {
  callbackUrl,
  encodeState,
  newState,
  STATE_COOKIE,
  STATE_COOKIE_PATH,
  STATE_MAX_AGE_SECONDS,
  stateCookieSecure,
} from "@/lib/tiktok/oauth-state";

// "Connect TikTok" in /admin/community: sends the owner to TikTok's consent
// page. Admin only.
export async function GET(request: NextRequest) {
  if (!(await getAdmin())) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }
  if (!tiktokCredentials()) {
    return NextResponse.redirect(
      new URL("/admin/community?tiktok=not_configured#tiktok", request.url),
    );
  }

  const state = newState();
  const redirectUri = callbackUrl(request);
  const response = NextResponse.redirect(authorizeUrl(state, redirectUri));
  response.cookies.set(STATE_COOKIE, encodeState({ state, redirectUri }), {
    httpOnly: true,
    secure: stateCookieSecure(),
    // TikTok sends the owner back with a top-level GET, which lax allows.
    sameSite: "lax",
    path: STATE_COOKIE_PATH,
    maxAge: STATE_MAX_AGE_SECONDS,
  });
  return response;
}
