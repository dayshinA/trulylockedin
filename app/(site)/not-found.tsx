import type { Metadata } from "next";

import { StatusPage } from "@/components/site/status-page";

export const metadata: Metadata = { title: "Page not found" };

// A look, product or other page that no longer exists (notFound() in a site
// page). Renders inside the site layout, under the header.
export default function SiteNotFound() {
  return (
    <StatusPage
      code="404"
      title="This page isn't here"
      text="It may have been taken down or moved. Have a look at the latest work, or book your next appointment."
      actions={[
        { label: "Book an appointment", href: "/book" },
        { label: "See the work", href: "/work" },
        { label: "Shop", href: "/shop" },
      ]}
    />
  );
}
