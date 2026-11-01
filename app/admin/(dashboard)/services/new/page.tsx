import type { Metadata } from "next";

import { verifyAdmin } from "@/lib/auth/dal";
import { bookingRepository } from "@/lib/booking/server";
import { PageHeader } from "../../_components/admin-ui";
import { ServiceForm } from "../service-form";

export const metadata: Metadata = {
  title: "Add service",
};

export default async function NewServicePage() {
  await verifyAdmin();
  const categories = await bookingRepository().listCategories();
  return (
    <div className="flex max-w-xl flex-col gap-10">
      <PageHeader
        back={{ href: "/admin/services", label: "Services" }}
        title="Add service"
      />
      <ServiceForm categories={categories} />
    </div>
  );
}
