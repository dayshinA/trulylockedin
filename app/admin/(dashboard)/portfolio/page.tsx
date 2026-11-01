import type { Metadata } from "next";
import Link from "next/link";

import { CldImage } from "@/components/media/cld";
import { verifyAdmin } from "@/lib/auth/dal";
import { coverOf } from "@/lib/portfolio/media";
import { portfolioRepository } from "@/lib/portfolio/server";
import {
  Badge,
  PageHeader,
  primaryButton,
  rowLink,
  rowList,
  rowTitle,
} from "../_components/admin-ui";
import { StorageCleanup } from "./storage-cleanup";

export const metadata: Metadata = {
  title: "Portfolio",
};

export default async function PortfolioAdminPage() {
  await verifyAdmin();
  const items = await portfolioRepository().list();

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <PageHeader
        title="Portfolio"
        actions={
          <Link href="/admin/portfolio/new" className={primaryButton}>
            Add look
          </Link>
        }
      />

      {items.length === 0 ? (
        <p className="text-muted">
          No looks yet. Add your first one to start the Work gallery.
        </p>
      ) : (
        <ul className={rowList}>
          {items.map((item) => {
            const cover = coverOf(item);
            return (
              <li key={item.id}>
                <Link
                  href={`/admin/portfolio/${item.id}`}
                  className={rowLink}
                >
                  {cover ? (
                    <CldImage
                      src={cover.publicId}
                      assetType={cover.type}
                      width={64}
                      height={64}
                      crop="fill"
                      alt=""
                      className="size-16 shrink-0 rounded-sm object-cover"
                    />
                  ) : (
                    <span className="size-16 shrink-0 rounded-sm bg-surface" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className={rowTitle}>{item.title}</span>
                    <span className="block truncate text-sm text-muted">
                      {item.category || "No category"} · {item.media.length}{" "}
                      {item.media.length === 1 ? "item" : "items"}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1.5">
                    {!item.published && (
                      <Badge tone="muted">Hidden</Badge>
                    )}
                    {item.featured && (
                      <Badge tone="accent">Featured</Badge>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <StorageCleanup />
    </div>
  );
}
