import type { SiteContent } from "@/types/cms";

import { type Channel, ChannelIcon } from "./channel-icon";

// Only the channels the owner has filled in are shown.
// The contact details shown on the site. Until the owner adds a contact
// email, the privacy notice's (already public on /privacy) stands in, so
// there's always a way to get in touch.
export function publicContact(
  content: Pick<SiteContent, "contact" | "privacy">,
): SiteContent["contact"] {
  const { contact, privacy } = content;
  return contact.email || !privacy.contactEmail
    ? contact
    : { ...contact, email: privacy.contactEmail };
}

export function contactChannels(contact: SiteContent["contact"]) {
  const channels: {
    channel: Channel;
    label: string;
    value: string;
    href: string;
  }[] = [];
  if (contact.phone) {
    channels.push({
      channel: "phone",
      label: "Phone",
      value: contact.phone,
      href: `tel:${contact.phone.replace(/\s/g, "")}`,
    });
  }
  if (contact.whatsapp) {
    channels.push({
      channel: "whatsapp",
      label: "WhatsApp",
      value: "Message on WhatsApp",
      href: `https://wa.me/${contact.whatsapp.replace(/\D/g, "")}`,
    });
  }
  if (contact.email) {
    channels.push({
      channel: "email",
      label: "Email",
      value: contact.email,
      href: `mailto:${contact.email}`,
    });
  }
  if (contact.instagram) {
    const handle = contact.instagram.replace(/^@/, "");
    channels.push({
      channel: "instagram",
      label: "Instagram",
      value: `@${handle}`,
      href: `https://instagram.com/${handle}`,
    });
  }
  if (contact.tiktok) {
    const handle = contact.tiktok.replace(/^@/, "");
    channels.push({
      channel: "tiktok",
      label: "TikTok",
      value: `@${handle}`,
      href: `https://www.tiktok.com/@${handle}`,
    });
  }
  return channels;
}

export function ContactLinks({
  contact,
  className = "",
}: {
  contact: SiteContent["contact"];
  className?: string;
}) {
  const channels = contactChannels(contact);
  if (channels.length === 0) return null;
  return (
    <ul className={`flex flex-col text-sm ${className}`}>
      {channels.map(({ channel, label, value, href }) => (
        <li key={label}>
          <a
            href={href}
            {...(href.startsWith("http")
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
            className="flex min-h-11 items-center gap-3 text-ink transition-colors hover:text-brand-hover"
          >
            <span className="flex w-28 shrink-0 items-center gap-2 text-muted">
              <ChannelIcon
                channel={channel}
                className="size-4 shrink-0 text-accent-ink"
              />
              {label}
            </span>
            <span className="min-w-0 [overflow-wrap:anywhere]">{value}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
