import type { Metadata } from "next";

import { verifyAdmin } from "@/lib/auth/dal";
import { portfolioRepository } from "@/lib/portfolio/server";
import { PageHeader } from "../../_components/admin-ui";
import { PortfolioForm } from "../portfolio-form";

export const metadata: Metadata = {
  title: "Add look",
};

export default async function NewLookPage() {
  await verifyAdmin();
  const items = await portfolioRepository().list();
  const categories = [...new Set(items.map((i) => i.category).filter(Boolean))];

  return (
    <div className="flex max-w-xl flex-col gap-10">
      <PageHeader
        back={{ href: "/admin/portfolio", label: "Portfolio" }}
        title="Add look"
      />
      <PortfolioForm categories={categories} />
    </div>
  );
}
