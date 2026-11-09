import "server-only";

import type { Firestore } from "firebase-admin/firestore";
import { z } from "zod";

import type { TikTokConnection } from "@/types/tiktok";
import {
  refreshTokens,
  revokeToken,
  TikTokApiError,
  TikTokReconnectError,
  type TikTokTokens,
} from "./api";

// The single connected TikTok account lives at integrations/tiktok. Firestore
// rules deny all client access; only the Admin SDK reads it.

const DOC = { collection: "integrations", id: "tiktok" } as const;

// Refresh a little before the 24-hour access token runs out.
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

const connectionSchema = z.object({
  openId: z.string().min(1),
  scopes: z.array(z.string()),
  accessToken: z.string().min(1),
  accessExpiresAt: z.number(),
  refreshToken: z.string().min(1),
  refreshExpiresAt: z.number(),
  displayName: z.string().nullable(),
  connectedAt: z.string(),
  updatedAt: z.string(),
});

const ref = (db: Firestore) => db.collection(DOC.collection).doc(DOC.id);

export async function readConnection(db: Firestore): Promise<TikTokConnection | null> {
  const snapshot = await ref(db).get();
  if (!snapshot.exists) return null;
  return connectionSchema.parse(snapshot.data());
}

export async function saveConnection(
  db: Firestore,
  tokens: TikTokTokens,
  displayName: string | null,
  now = new Date(),
): Promise<void> {
  const connection: TikTokConnection = {
    ...tokens,
    displayName,
    connectedAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  await ref(db).set(connection);
}

// Revokes the token at TikTok (best effort) and forgets the account.
export async function deleteConnection(db: Firestore): Promise<void> {
  const connection = await readConnection(db).catch(() => null);
  if (connection) {
    await revokeToken(connection.accessToken).catch((error) =>
      console.warn("TikTok revoke failed", error),
    );
  }
  await ref(db).delete();
}

async function refreshConnection(
  db: Firestore,
  connection: TikTokConnection,
  now: number,
): Promise<TikTokConnection> {
  if (connection.refreshExpiresAt <= now) {
    throw new TikTokReconnectError("The TikTok connection has expired");
  }
  let tokens: TikTokTokens;
  try {
    tokens = await refreshTokens(connection.refreshToken, now);
  } catch (error) {
    // Another request may have refreshed (and rotated the refresh token)
    // first. Use its tokens if so.
    if (error instanceof TikTokReconnectError) {
      const latest = await readConnection(db);
      if (latest && latest.refreshToken !== connection.refreshToken) {
        return latest;
      }
    }
    throw error;
  }
  const updated: TikTokConnection = {
    ...connection,
    ...tokens,
    updatedAt: new Date(now).toISOString(),
  };
  await ref(db).set(updated);
  return updated;
}

// Runs `call` with a valid access token, refreshing it first when it's about
// to run out, and once more if TikTok rejects it. Returns null when no
// account is connected. Throws TikTokReconnectError when the owner has to
// connect again.
export async function withAccessToken<T>(
  db: Firestore,
  call: (accessToken: string, connection: TikTokConnection) => Promise<T>,
  now = Date.now(),
): Promise<T | null> {
  let connection = await readConnection(db);
  if (!connection) return null;

  if (connection.accessExpiresAt - REFRESH_MARGIN_MS <= now) {
    connection = await refreshConnection(db, connection, now);
  }
  try {
    return await call(connection.accessToken, connection);
  } catch (error) {
    if (error instanceof TikTokApiError && error.code === "access_token_invalid") {
      connection = await refreshConnection(db, connection, now);
      try {
        return await call(connection.accessToken, connection);
      } catch (retryError) {
        if (
          retryError instanceof TikTokApiError &&
          retryError.code === "access_token_invalid"
        ) {
          throw new TikTokReconnectError(retryError.message);
        }
        throw retryError;
      }
    }
    if (error instanceof TikTokApiError && error.code === "scope_not_authorized") {
      throw new TikTokReconnectError(error.message);
    }
    throw error;
  }
}
