import type { Metadata } from "next";

import { verifyAdmin } from "@/lib/auth/dal";
import { PageHeader } from "../../_components/admin-ui";
import { ServiceForm } from "../service-form";

export const metadata: Metadata = {
  title: "Add service",
};

export default async function NewServicePage() {
  await verifyAdmin();
  return (
    <div className="flex max-w-xl flex-col gap-10">
      <PageHeader
        back={{ href: "/admin/services", label: "Services" }}
        title="Add service"
      />
      <ServiceForm />
    </div>
  );
}
