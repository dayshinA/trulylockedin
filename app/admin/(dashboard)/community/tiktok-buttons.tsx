"use client";

import { useState, useTransition } from "react";

import { FormNotice } from "@/components/forms/field-error";
import { dangerButton, outlineButton } from "../_components/admin-ui";
import { disconnectTikTokAction, refreshTikTokAction } from "./tiktok-actions";

// "Update now" and a two-tap "Disconnect".
export function TikTokButtons({ connected }: { connected: boolean }) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string }>();

  function update() {
    setMessage(undefined);
    startTransition(async () => {
      await refreshTikTokAction();
      setMessage({ tone: "success", text: "Updated. The Community page now shows your latest videos." });
    });
  }

  function disconnect() {
    setMessage(undefined);
    startTransition(async () => {
      const result = await disconnectTikTokAction();
      setConfirming(false);
      if (result.status === "error") setMessage({ tone: "error", text: result.message });
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {message && <FormNotice tone={message.tone}>{message.text}</FormNotice>}
      {confirming ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm">
            Your TikTok videos will disappear from the website. Your TikTok
            account and videos aren&rsquo;t touched. You can connect again any
            time.
          </p>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={disconnect} disabled={pending} className={dangerButton}>
              {pending ? "Disconnecting…" : "Disconnect TikTok"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={pending}
              className={outlineButton}
            >
              Keep it connected
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          {connected && (
            <button type="button" onClick={update} disabled={pending} className={outlineButton}>
              {pending ? "Updating…" : "Update now"}
            </button>
          )}
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={pending}
            className={outlineButton}
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
