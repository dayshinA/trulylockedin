import type { SiteContent } from "@/types/cms";

// Only the channels the owner has filled in are shown.
export function contactChannels(contact: SiteContent["contact"]) {
  const channels: { label: string; value: string; href: string }[] = [];
  if (contact.phone) {
    channels.push({
      label: "Phone",
      value: contact.phone,
      href: `tel:${contact.phone.replace(/\s/g, "")}`,
    });
  }
  if (contact.whatsapp) {
    channels.push({
      label: "WhatsApp",
      value: "Message on WhatsApp",
      href: `https://wa.me/${contact.whatsapp.replace(/\D/g, "")}`,
    });
  }
  if (contact.email) {
    channels.push({
      label: "Email",
      value: contact.email,
      href: `mailto:${contact.email}`,
    });
  }
  if (contact.instagram) {
    const handle = contact.instagram.replace(/^@/, "");
    channels.push({
      label: "Instagram",
      value: `@${handle}`,
      href: `https://instagram.com/${handle}`,
    });
  }
  if (contact.tiktok) {
    const handle = contact.tiktok.replace(/^@/, "");
    channels.push({
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
      {channels.map(({ label, value, href }) => (
        <li key={label}>
          <a
            href={href}
            {...(href.startsWith("http")
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
            className="flex min-h-11 items-center gap-3 text-ink transition-colors hover:text-brand-hover"
          >
            <span className="w-20 shrink-0 text-muted">{label}</span>
            <span className="min-w-0 [overflow-wrap:anywhere]">{value}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
