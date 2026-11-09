import { connection } from "next/server";

import { FormNotice } from "@/components/forms/field-error";
import { adminDb } from "@/lib/firebase/admin";
import { formatDate } from "@/lib/format";
import { fetchUser, fetchVideos, tiktokCredentials, TikTokReconnectError } from "@/lib/tiktok/api";
import { withAccessToken } from "@/lib/tiktok/store";
import { primaryButton, Section } from "../_components/admin-ui";
import { Tip } from "../_components/help";
import { TikTokButtons } from "./tiktok-buttons";

// The ?tiktok=… result from /api/tiktok/callback.
const RESULTS: Record<string, { tone: "success" | "error"; text: string }> = {
  connected: { tone: "success", text: "TikTok is connected. Your videos are now on the Community page." },
  denied: { tone: "error", text: "TikTok wasn't connected because access was cancelled on TikTok." },
  scope: {
    tone: "error",
    text: "TikTok was connected without permission to see your videos. Connect again and leave every permission ticked.",
  },
  expired: { tone: "error", text: "That took too long or was opened in another browser. Please press Connect TikTok again." },
  failed: { tone: "error", text: "Something went wrong connecting TikTok. Please try again." },
  not_configured: { tone: "error", text: "TikTok isn't set up on the website yet. Ask your developer." },
};

type Status =
  | { state: "not_configured" }
  | { state: "disconnected" }
  | { state: "reconnect" }
  | { state: "error" }
  | {
      state: "connected";
      displayName: string | null;
      avatarUrl: string | null;
      videoCount: number;
      connectedAt: string;
      refreshExpiresAt: number;
    };

async function loadStatus(): Promise<Status> {
  if (!tiktokCredentials()) return { state: "not_configured" };
  try {
    const result = await withAccessToken(adminDb(), async (token, saved) => {
      const [user, videos] = await Promise.all([fetchUser(token), fetchVideos(token)]);
      return {
        state: "connected" as const,
        displayName: user.displayName ?? saved.displayName,
        avatarUrl: user.avatarUrl,
        videoCount: videos.length,
        connectedAt: saved.connectedAt,
        refreshExpiresAt: saved.refreshExpiresAt,
      };
    });
    return result ?? { state: "disconnected" };
  } catch (error) {
    if (error instanceof TikTokReconnectError) {
      console.error("TikTok needs reconnecting", error);
      return { state: "reconnect" };
    }
    console.error("TikTok status unavailable", error);
    return { state: "error" };
  }
}

const connectButton = (label: string) => (
  // A plain link: the route redirects to TikTok and back.
  <a href="/api/tiktok/connect" className={primaryButton}>
    {label}
  </a>
);

export async function TikTokCard({ result }: { result?: string }) {
  await connection();
  const status = await loadStatus();
  const notice = result ? RESULTS[result] : undefined;

  return (
    <Section
      title="TikTok"
      description="Show your latest TikTok videos on the Community page. They update by themselves when you post."
    >
      {notice && <FormNotice tone={notice.tone}>{notice.text}</FormNotice>}

      {status.state === "not_configured" && (
        <p className="text-sm text-muted">
          TikTok isn&rsquo;t set up on the website yet. Ask your developer.
        </p>
      )}

      {status.state === "disconnected" && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted">
            Not connected. Press the button, log in to the salon&rsquo;s
            TikTok account and tap <strong>Authorize</strong>. You&rsquo;ll come
            straight back here.
          </p>
          {connectButton("Connect TikTok")}
        </div>
      )}

      {status.state === "reconnect" && (
        <div className="flex flex-col gap-4">
          <FormNotice>
            TikTok has disconnected, so your videos aren&rsquo;t showing on the
            website. This happens once a year, or if access was removed in the
            TikTok app. Connect again to fix it.
          </FormNotice>
          {connectButton("Reconnect TikTok")}
          <TikTokButtons connected={false} />
        </div>
      )}

      {status.state === "error" && (
        <div className="flex flex-col gap-4">
          <FormNotice>
            Couldn&rsquo;t reach TikTok just now. Your videos stay on the
            website; try this page again in a few minutes.
          </FormNotice>
          <TikTokButtons connected />
        </div>
      )}

      {status.state === "connected" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            {status.avatarUrl ? (
              // TikTok's signed, short-lived image link: not for next/image.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={status.avatarUrl}
                alt=""
                width={56}
                height={56}
                referrerPolicy="no-referrer"
                className="size-14 shrink-0 rounded-full bg-surface object-cover"
              />
            ) : (
              <span className="size-14 shrink-0 rounded-full bg-surface" />
            )}
            <div className="min-w-0">
              <p className="truncate font-display text-xl font-semibold">
                Connected as {status.displayName ?? "your TikTok account"}
              </p>
              <p className="text-sm text-muted">
                {status.videoCount === 0
                  ? "No public videos to show yet."
                  : `Showing your latest ${status.videoCount} public ${status.videoCount === 1 ? "video" : "videos"}.`}{" "}
                Connected {formatDate(new Date(status.connectedAt))}.
              </p>
            </div>
          </div>
          <Tip>
            New posts appear on the website within an hour. Press{" "}
            <strong>Update now</strong> to show one straight away. Only public
            videos are shown.
          </Tip>
          <p className="text-sm text-muted">
            TikTok asks you to connect again once a year (next by{" "}
            {formatDate(new Date(status.refreshExpiresAt))}). This page will
            tell you when.
          </p>
          <TikTokButtons connected />
        </div>
      )}
    </Section>
  );
}
