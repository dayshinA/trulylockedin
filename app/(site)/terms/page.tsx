import type { Metadata } from "next";

import { LegalPage } from "@/components/site/legal-page";
import { getSiteContent } from "@/lib/data/public";

export const metadata: Metadata = {
  title: "Terms & returns",
  description:
    "Terms for appointments, deposits, cancellations, shop orders and returns.",
};

export default async function TermsPage() {
  const { terms, privacy, contact } = await getSiteContent();
  return (
    <LegalPage
      title="Terms & returns"
      updatedOn={terms.updatedOn}
      body={terms.body}
      privacy={privacy}
      contact={contact}
      role="trader"
    />
  );
}
