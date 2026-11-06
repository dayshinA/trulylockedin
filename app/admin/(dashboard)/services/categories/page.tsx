import type { Metadata } from "next";

import { verifyAdmin } from "@/lib/auth/dal";
import { bookingRepository } from "@/lib/booking/server";
import { PageHeader, Section } from "../../_components/admin-ui";
import { PageGuide } from "../../_components/help";
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
      />
      <PageGuide
        id="service-categories"
      >
          <li>
            Categories are the headings your services are grouped under on
            the website and when clients book.
          </li>
          <li>
            <strong>Order</strong> decides which heading comes first: 0 at the
            top, then 1, 2 and so on. Press <strong>Save</strong> under each
            one you change.
          </li>
          <li>
            Unticking <strong>Show on the website</strong> hides the category
            and every service in it from clients. You can still add bookings
            for those services yourself.
          </li>
          <li>
            A category can only be deleted once it&rsquo;s empty: move its
            services to another category first (open the service and change
            its category).
          </li>
      </PageGuide>

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
