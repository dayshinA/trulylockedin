import Link from "next/link";

import { PageHeader, primaryButton, textLink } from "./_components/admin-ui";

// A booking, order, look, product, service or member that doesn't exist (or
// was deleted). Renders inside the admin shell.
export default function AdminNotFound() {
  return (
    <PageHeader eyebrow="Not found" title="This isn't here any more">
      <p>It may have been deleted, or the link is out of date.</p>
      <div className="mt-6 flex flex-wrap items-center gap-6">
        <Link href="/admin" className={primaryButton}>
          Back to overview
        </Link>
        <Link href="/admin/bookings" className={textLink}>
          Bookings
        </Link>
      </div>
    </PageHeader>
  );
}
