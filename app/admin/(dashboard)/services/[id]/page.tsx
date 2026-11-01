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
  const service = await bookingRepository().getService(id);
  if (!service) notFound();

  return (
    <div className="flex max-w-xl flex-col gap-10">
      <PageHeader
        back={{ href: "/admin/services", label: "Services" }}
        title={service.name}
      />
      <ServiceForm service={service} />

      <DangerZone summary="Delete this service">
        <p className="text-muted">
          Existing bookings keep their details. To stop new bookings but keep
          the service, untick &ldquo;Bookable online&rdquo; instead.
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
