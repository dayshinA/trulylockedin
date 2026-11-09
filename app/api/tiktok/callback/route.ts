import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

import { getAdmin } from "@/lib/auth/dal";
import { PUBLIC_TAGS } from "@/lib/data/public";
import { adminDb } from "@/lib/firebase/admin";
import { exchangeCode, fetchUser } from "@/lib/tiktok/api";
import {
  decodeState,
  sameState,
  STATE_COOKIE,
  STATE_COOKIE_PATH,
} from "@/lib/tiktok/oauth-state";
import { saveConnection } from "@/lib/tiktok/store";

// TikTok redirects here after the owner approves (or declines). The result is
// shown on /admin/community via ?tiktok=…
export async function GET(request: NextRequest) {
  const back = (result: string) => {
    const response = NextResponse.redirect(
      new URL(`/admin/community?tiktok=${result}#tiktok`, request.url),
    );
    response.cookies.set(STATE_COOKIE, "", { path: STATE_COOKIE_PATH, maxAge: 0 });
    return response;
  };

  if (!(await getAdmin())) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  const params = request.nextUrl.searchParams;
  const saved = decodeState(request.cookies.get(STATE_COOKIE)?.value);
  const state = params.get("state");
  if (!saved || !state || !sameState(saved.state, state)) return back("expired");

  // e.g. error=access_denied when the owner taps Cancel on TikTok.
  if (params.get("error")) return back("denied");

  const code = params.get("code");
  if (!code) return back("failed");

  try {
    const tokens = await exchangeCode(code, saved.redirectUri);
    // The owner can untick a permission on TikTok's consent screen.
    if (!tokens.scopes.includes("video.list")) return back("scope");

    const user = await fetchUser(tokens.accessToken).catch((error) => {
      console.warn("TikTok user info unavailable", error);
      return { displayName: null };
    });
    await saveConnection(adminDb(), tokens, user.displayName);
  } catch (error) {
    console.error("TikTok connect failed", error);
    return back("failed");
  }

  // updateTag is Server Actions only; expire now so /community refetches.
  revalidateTag(PUBLIC_TAGS.tiktok, { expire: 0 });
  return back("connected");
}
