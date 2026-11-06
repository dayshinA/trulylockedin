import type { Metadata } from "next";

import { LegalPage } from "@/components/site/legal-page";
import { getSiteContent } from "@/lib/data/public";

export const metadata: Metadata = {
  title: "Privacy notice",
  description: "How we collect, use and look after your personal information.",
};

export default async function PrivacyPage() {
  const { privacy, contact } = await getSiteContent();
  return (
    <LegalPage
      title="Privacy notice"
      updatedOn={privacy.updatedOn}
      body={privacy.body}
      privacy={privacy}
      contact={contact}
      role="controller"
    />
  );
}
