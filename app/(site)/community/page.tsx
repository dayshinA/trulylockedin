import type { Metadata } from "next";
import Link from "next/link";

import { BookCta } from "@/components/site/book-cta";
import { PageIntro } from "@/components/site/page-intro";
import { TikTokSection } from "@/components/site/tiktok-section";
import { WorkGallery } from "@/components/site/work-gallery";
import {
  getPublishedWork,
  getSiteContent,
  getTikTokVideos,
} from "@/lib/data/public";

export const metadata: Metadata = {
  title: "Community",
  description: "Starter locs, retwists, styles and extensions from the chair.",
};

export default async function WorkPage() {
  const [items, videos, content] = await Promise.all([
    getPublishedWork(),
    getTikTokVideos(),
    getSiteContent(),
  ]);

  return (
    <main className="flex flex-col">
      <PageIntro title="From the *chair*">
        A look at recent locs, retwists and styles.
      </PageIntro>
      <section className="px-4 pb-24 sm:px-6">
        <div className="mx-auto max-w-6xl">
          {items.length > 0 ? (
            <WorkGallery items={items} />
          ) : videos.length > 0 ? null : (
            <div className="border-t border-line pt-8">
              <p className="font-display text-3xl font-semibold">
                New looks coming soon
              </p>
              <p className="mt-2 text-muted">
                In the meantime, see the services or book a consultation.
              </p>
              <Link
                href="/services"
                className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-brand decoration-accent decoration-2 underline-offset-4 hover:underline pointer-coarse:underline"
              >
                View services <span aria-hidden className="text-accent">&nbsp;→</span>
              </Link>
            </div>
          )}
        </div>
      </section>
      <TikTokSection videos={videos} handle={content.contact.tiktok} />
      <BookCta />
    </main>
  );
}
