import { LegalText } from "@/components/site/legal-text";
import { PageIntro } from "@/components/site/page-intro";
import { SITE_NAME } from "@/lib/site";
import type { SiteContent } from "@/types/cms";

const updatedLabel = (date: string) => {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
};

// Shared layout for /privacy and /terms. "Who we are" is built from the admin
// fields (the owner's name, the privacy email and the contact address), so the
// owner only types those once.
export function LegalPage({
  title,
  updatedOn,
  body,
  privacy,
  contact,
  role,
}: {
  title: string;
  updatedOn: string;
  body: string;
  privacy: SiteContent["privacy"];
  contact: SiteContent["contact"];
  role: "controller" | "trader";
}) {
  const owner = privacy.controllerName;
  const runBy = owner
    ? `${SITE_NAME} is the trading name of ${owner}, a sole trader`
    : `${SITE_NAME} is run by a sole trader`;

  return (
    <main className="flex flex-col">
      <PageIntro eyebrow={`Last updated ${updatedLabel(updatedOn)}`} title={title} />

      <section className="px-4 pb-24 sm:px-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-12">
          <div className="border-y border-line py-6">
            <h2 className="font-display text-2xl font-semibold">Who we are</h2>
            <p className="mt-2 text-muted">
              {runBy}
              {role === "controller"
                ? `${owner ? `. ${owner} is` : ", who is"} responsible for your personal information (the “data controller”).`
                : "."}
            </p>
            <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
              <dt className="font-semibold text-ink">Email</dt>
              <dd>
                <a
                  href={`mailto:${privacy.contactEmail}`}
                  className="font-semibold text-brand underline decoration-accent underline-offset-4 break-all hover:text-brand-hover"
                >
                  {privacy.contactEmail}
                </a>
              </dd>
              {contact.addressLines.length > 0 && (
                <>
                  <dt className="font-semibold text-ink">Address</dt>
                  <dd className="text-muted">{contact.addressLines.join(", ")}</dd>
                </>
              )}
            </dl>
          </div>

          <LegalText body={body} />
        </div>
      </section>
    </main>
  );
}
