import { SplitHeading } from "@/components/motion/split-heading";
import type { TikTokVideo } from "@/types/tiktok";
import { TikTokGrid } from "./tiktok-grid";

// "From our TikTok" on /community. Hidden entirely when TikTok isn't connected
// or has no public videos.
export function TikTokSection({
  videos,
  handle,
}: {
  videos: TikTokVideo[];
  /** The handle from /admin/content → Contact, for the follow link. */
  handle?: string;
}) {
  if (videos.length === 0) return null;
  const profile = handle ? `https://www.tiktok.com/@${handle.replace(/^@/, "")}` : null;

  return (
    <section className="surface-warm px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
          <SplitHeading className="font-display text-4xl font-semibold sm:text-6xl">
            From our *TikTok*
          </SplitHeading>
          {profile && (
            <a
              href={profile}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center text-sm font-semibold text-brand decoration-accent decoration-2 underline-offset-4 hover:underline pointer-coarse:underline"
            >
              Follow us on TikTok <span aria-hidden className="text-accent">&nbsp;↗</span>
            </a>
          )}
        </div>
        <div className="mt-10">
          <TikTokGrid videos={videos.slice(0, 12)} />
        </div>
      </div>
    </section>
  );
}
