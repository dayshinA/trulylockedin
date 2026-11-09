import type { Metadata } from "next";

import { StatusPage } from "@/components/site/status-page";

export const metadata: Metadata = { title: "Page not found" };

// Any URL that matches no route. It renders in the root layout only (no site
// header), so it shows the logo itself.
export default function NotFound() {
  return (
    <StatusPage
      standalone
      code="404"
      title="This page isn't here"
      text="The link may be old or mistyped. Have a look at our community, or book your next appointment."
      actions={[
        { label: "Book an appointment", href: "/book" },
        { label: "Home", href: "/" },
        { label: "See the community", href: "/community" },
      ]}
    />
  );
}
