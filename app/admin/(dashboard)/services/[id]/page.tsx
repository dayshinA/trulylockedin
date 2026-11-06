import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { verifyAdmin } from "@/lib/auth/dal";
import { bookingRepository } from "@/lib/booking/server";
import {
  dangerButton,
  DangerZone,
  PageHeader,
} from "../../_components/admin-ui";
import { deleteServiceAction } from "../actions";
import { ServiceForm } from "../service-form";

export const metadata: Metadata = {
  title: "Edit service",
};

export default async function EditServicePage({
  params,
}: PageProps<"/admin/services/[id]">) {
  await verifyAdmin();
  const { id } = await params;
  const repo = bookingRepository();
  const [service, categories] = await Promise.all([
    repo.getService(id),
    repo.listCategories(),
  ]);
  if (!service) notFound();

  return (
    <div className="flex max-w-xl flex-col gap-10">
      <PageHeader
        back={{ href: "/admin/services", label: "Services" }}
        title={service.name}
      />
      <ServiceForm service={service} categories={categories} />

      <DangerZone summary="Delete this service">
        <p className="text-muted">
          This removes the service from the website for good, and can&rsquo;t
          be undone. Bookings already made for it aren&rsquo;t cancelled and
          keep their details. If you might offer it again, untick &ldquo;Show
          on the website&rdquo; above instead: it disappears for clients, but
          you can bring it back with one tick.
        </p>
        <form action={deleteServiceAction}>
          <input type="hidden" name="id" value={service.id} />
          <button type="submit" className={dangerButton}>
            Delete permanently
          </button>
        </form>
      </DangerZone>
    </div>
  );
}
