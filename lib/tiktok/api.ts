import "server-only";

import { z } from "zod";

import type { TikTokVideo } from "@/types/tiktok";

// Thin wrappers over TikTok's v2 endpoints (Login Kit + TikTok API). No SDK:
// TikTok doesn't publish one for Node, and these are four plain requests.
// https://developers.tiktok.com/doc/login-kit-web
// https://developers.tiktok.com/doc/display-api-get-started

export const TIKTOK_SCOPES = ["user.info.basic", "video.list"] as const;

const AUTHORIZE_URL = "https://www.tiktok.com/v2/auth/authorize/";
const API = "https://open.tiktokapis.com/v2";

const VIDEO_FIELDS = [
  "id",
  "title",
  "video_description",
  "cover_image_url",
  "share_url",
  "embed_link",
  "create_time",
  "width",
  "height",
].join(",");

// The token was rejected or has run out and can't be renewed: the owner has to
// connect again from the admin.
export class TikTokReconnectError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TikTokReconnectError";
  }
}

export class TikTokApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "TikTokApiError";
  }
}

export function tiktokCredentials(): { clientKey: string; clientSecret: string } | null {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  return clientKey && clientSecret ? { clientKey, clientSecret } : null;
}

function requireCredentials() {
  const credentials = tiktokCredentials();
  if (!credentials) throw new Error("TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET are not set");
  return credentials;
}

export function authorizeUrl(state: string, redirectUri: string): string {
  const { clientKey } = requireCredentials();
  const params = new URLSearchParams({
    client_key: clientKey,
    scope: TIKTOK_SCOPES.join(","),
    response_type: "code",
    redirect_uri: redirectUri,
    state,
    // Always show the consent screen, so the owner can see which account
    // they're connecting.
    disable_auto_auth: "1",
  });
  return `${AUTHORIZE_URL}?${params}`;
}

const tokenSchema = z.object({
  open_id: z.string().min(1),
  scope: z.string(),
  access_token: z.string().min(1),
  expires_in: z.number(),
  refresh_token: z.string().min(1),
  refresh_expires_in: z.number(),
});

export type TikTokTokens = {
  openId: string;
  scopes: string[];
  accessToken: string;
  accessExpiresAt: number;
  refreshToken: string;
  refreshExpiresAt: number;
};

async function tokenRequest(
  body: Record<string, string>,
  now: number,
): Promise<TikTokTokens> {
  const { clientKey, clientSecret } = requireCredentials();
  const response = await fetch(`${API}/oauth/token/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cache-Control": "no-cache",
    },
    body: new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      ...body,
    }),
    cache: "no-store",
  });
  const json: unknown = await response.json().catch(() => null);
  const parsed = tokenSchema.safeParse(json);
  if (!parsed.success) {
    const error = z
      .object({ error: z.string(), error_description: z.string().optional() })
      .safeParse(json);
    const code = error.success ? error.data.error : `http_${response.status}`;
    const message = error.success
      ? `TikTok token request failed: ${error.data.error} ${error.data.error_description ?? ""}`.trim()
      : `TikTok token request failed (HTTP ${response.status})`;
    if (code === "invalid_grant") throw new TikTokReconnectError(message);
    throw new TikTokApiError(message, code);
  }
  const t = parsed.data;
  return {
    openId: t.open_id,
    scopes: t.scope.split(",").map((s) => s.trim()).filter(Boolean),
    accessToken: t.access_token,
    accessExpiresAt: now + t.expires_in * 1000,
    refreshToken: t.refresh_token,
    refreshExpiresAt: now + t.refresh_expires_in * 1000,
  };
}

export function exchangeCode(
  code: string,
  redirectUri: string,
  now = Date.now(),
): Promise<TikTokTokens> {
  return tokenRequest(
    { code, grant_type: "authorization_code", redirect_uri: redirectUri },
    now,
  );
}

// TikTok may return a new refresh token; the caller must save it.
export function refreshTokens(
  refreshToken: string,
  now = Date.now(),
): Promise<TikTokTokens> {
  return tokenRequest(
    { grant_type: "refresh_token", refresh_token: refreshToken },
    now,
  );
}

// Best effort: the stored tokens are deleted whatever TikTok says.
export async function revokeToken(accessToken: string): Promise<void> {
  const { clientKey, clientSecret } = requireCredentials();
  const response = await fetch(`${API}/oauth/revoke/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      token: accessToken,
    }),
    cache: "no-store",
  });
  if (!response.ok) {
    console.warn(`TikTok revoke returned HTTP ${response.status}`);
  }
}

const envelopeError = z.object({
  code: z.string(),
  message: z.string().optional(),
  log_id: z.string().optional(),
});

// Data API responses are { data, error: { code: "ok" | ... } }.
async function apiRequest(
  path: string,
  accessToken: string,
  init: { method: "GET" | "POST"; body?: unknown },
): Promise<unknown> {
  const response = await fetch(`${API}${path}`, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const json = (await response.json().catch(() => null)) as {
    data?: unknown;
    error?: unknown;
  } | null;
  const error = envelopeError.safeParse(json?.error);
  const code = error.success ? error.data.code : `http_${response.status}`;
  if (code !== "ok") {
    const message = `TikTok ${path} failed: ${code}${
      error.success && error.data.message ? ` (${error.data.message})` : ""
    }${error.success && error.data.log_id ? ` log_id=${error.data.log_id}` : ""}`;
    throw new TikTokApiError(message, code);
  }
  return json?.data;
}

const userSchema = z.object({
  user: z.object({
    open_id: z.string().optional(),
    display_name: z.string().optional(),
    avatar_url: z.string().optional(),
  }),
});

export type TikTokUser = { displayName: string | null; avatarUrl: string | null };

export async function fetchUser(accessToken: string): Promise<TikTokUser> {
  const data = userSchema.parse(
    await apiRequest(
      "/user/info/?fields=open_id,display_name,avatar_url",
      accessToken,
      { method: "GET" },
    ),
  );
  return {
    displayName: data.user.display_name || null,
    avatarUrl: data.user.avatar_url || null,
  };
}

const videoSchema = z.object({
  id: z.string().min(1),
  title: z.string().optional(),
  video_description: z.string().optional(),
  cover_image_url: z.url(),
  share_url: z.url(),
  embed_link: z.url().optional(),
  create_time: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
});

const videoListSchema = z.object({
  videos: z.array(z.unknown()).default([]),
});

// The account's latest public videos, newest first (max 20 per TikTok).
export async function fetchVideos(
  accessToken: string,
  maxCount = 20,
): Promise<TikTokVideo[]> {
  const data = videoListSchema.parse(
    await apiRequest(`/video/list/?fields=${VIDEO_FIELDS}`, accessToken, {
      method: "POST",
      body: { max_count: maxCount },
    }),
  );
  // Skip anything malformed rather than failing the whole feed.
  return data.videos.flatMap((raw) => {
    const parsed = videoSchema.safeParse(raw);
    if (!parsed.success) return [];
    const v = parsed.data;
    return [
      {
        id: v.id,
        title: v.title?.trim() ?? "",
        description: v.video_description?.trim() ?? "",
        coverUrl: v.cover_image_url,
        shareUrl: v.share_url,
        embedUrl: v.embed_link ?? `https://www.tiktok.com/player/v1/${v.id}`,
        createdAt: v.create_time ?? null,
        width: v.width ?? null,
        height: v.height ?? null,
      },
    ];
  });
}
