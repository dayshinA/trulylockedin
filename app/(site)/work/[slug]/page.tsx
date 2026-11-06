import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { WorkViewer } from "@/components/media/work-viewer";
import { BookCta } from "@/components/site/book-cta";
import { WorkGallery } from "@/components/site/work-gallery";
import { getPublishedWork, getWork } from "@/lib/data/public";

export async function generateMetadata({
  params,
}: PageProps<"/work/[slug]">): Promise<Metadata> {
  const item = await getWork((await params).slug);
  return item
    ? {
        title: item.title,
        description: item.description || `${item.title} — ${item.category}`,
      }
    : { title: "Page not found" };
}

export default function WorkItemPage({ params }: PageProps<"/work/[slug]">) {
  return (
    <main className="flex flex-col">
      <Suspense fallback={<div className="min-h-svh" />}>
        <WorkItem params={params} />
      </Suspense>
      <BookCta title="Love this *look*?" />
    </main>
  );
}

async function WorkItem({
  params,
}: {
  params: PageProps<"/work/[slug]">["params"];
}) {
  const { slug } = await params;
  const item = await getWork(slug);
  if (!item) notFound();

  const related = (await getPublishedWork())
    .filter((i) => i.id !== item.id && i.category === item.category)
    .slice(0, 3);

  return (
    <>
      <section className="px-4 pt-32 pb-12 sm:px-6 sm:pt-40">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/work"
            className="-ml-1 inline-flex min-h-11 items-center gap-2 px-1 text-sm font-semibold text-brand transition-colors hover:text-brand-hover"
          >
            <ArrowLeft aria-hidden className="size-4" />
            Back to work
          </Link>
          <h1 className="mt-4 max-w-3xl font-display text-5xl leading-[1.05] font-semibold sm:text-7xl">
            {item.title}
          </h1>
          {item.category && (
            <p className="mt-3 text-muted">{item.category}</p>
          )}
          {item.description && (
            <p className="mt-6 max-w-xl text-lg whitespace-pre-line text-muted">
              {item.description}
            </p>
          )}
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6">
        <WorkViewer media={item.media} title={item.title} />
      </section>

      {related.length > 0 && (
        <section className="px-4 pb-24 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <h2 className="mb-6 font-display text-3xl font-semibold sm:text-4xl">
              More {item.category.toLowerCase()}
            </h2>
            <WorkGallery items={related} />
          </div>
        </section>
      )}
    </>
  );
}
