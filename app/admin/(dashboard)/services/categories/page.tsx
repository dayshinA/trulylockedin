import type { Metadata } from "next";

import { verifyAdmin } from "@/lib/auth/dal";
import { bookingRepository } from "@/lib/booking/server";
import { PageHeader, Section } from "../../_components/admin-ui";
import { CategoryForm } from "./category-form";

export const metadata: Metadata = {
  title: "Service categories",
};

export default async function CategoriesPage() {
  await verifyAdmin();
  const repo = bookingRepository();
  const [categories, services] = await Promise.all([
    repo.listCategories(),
    repo.listServices(),
  ]);

  return (
    <div className="flex max-w-xl flex-col gap-12">
      <PageHeader
        back={{ href: "/admin/services", label: "Services" }}
        title="Categories"
      >
        Hiding a category hides all its services from the website and online
        booking. You can still book them by hand.
      </PageHeader>

      <div className="flex flex-col gap-8">
        {categories.map((category) => (
          <CategoryForm
            key={category.id}
            category={category}
            serviceCount={
              services.filter((s) => s.categoryId === category.id).length
            }
          />
        ))}
      </div>

      <Section title="Add a category">
        {/* A new key clears the form once the category has been added. */}
        <CategoryForm
          key={categories.length}
          nextOrder={Math.max(-1, ...categories.map((c) => c.order)) + 1}
        />
      </Section>
    </div>
  );
}
