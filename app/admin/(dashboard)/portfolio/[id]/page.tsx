import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { verifyAdmin } from "@/lib/auth/dal";
import { portfolioRepository } from "@/lib/portfolio/server";
import {
  dangerButton,
  DangerZone,
  PageHeader,
  textLink,
} from "../../_components/admin-ui";
import { deletePortfolioAction } from "../actions";
import { PortfolioForm } from "../portfolio-form";

export const metadata: Metadata = {
  title: "Edit look",
};

export default async function EditLookPage({
  params,
}: PageProps<"/admin/portfolio/[id]">) {
  await verifyAdmin();
  const { id } = await params;
  const repo = portfolioRepository();
  const [item, items] = await Promise.all([repo.get(id), repo.list()]);
  if (!item) notFound();
  const categories = [...new Set(items.map((i) => i.category).filter(Boolean))];

  return (
    <div className="flex max-w-xl flex-col gap-10">
      <PageHeader
        back={{ href: "/admin/portfolio", label: "Portfolio" }}
        title={item.title}
        actions={
          item.published && (
            <Link href={`/work/${item.id}`} target="_blank" className={textLink}>
              View on site ↗
            </Link>
          )
        }
      />
      <PortfolioForm item={item} categories={categories} />

      <DangerZone summary="Delete this look">
        <p className="text-muted">
          This removes the look and deletes its photos and videos from storage.
          To just hide it, untick &ldquo;Show on the website&rdquo; instead.
        </p>
        <form action={deletePortfolioAction}>
          <input type="hidden" name="id" value={item.id} />
          <button type="submit" className={dangerButton}>
            Delete permanently
          </button>
        </form>
      </DangerZone>
    </div>
  );
}
