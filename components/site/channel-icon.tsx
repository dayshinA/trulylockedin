import { Mail, Phone } from "lucide-react";

// Icons for the contact channels. lucide has no brand logos, so Instagram,
// TikTok and WhatsApp are drawn here, in the current text colour.
export type Channel = "phone" | "whatsapp" | "email" | "instagram" | "tiktok";

export function ChannelIcon({
  channel,
  className = "size-6",
}: {
  channel: Channel;
  className?: string;
}) {
  switch (channel) {
    case "phone":
      return <Phone aria-hidden className={className} />;
    case "email":
      return <Mail aria-hidden className={className} />;
    case "instagram":
      return (
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className={className}
        >
          <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
          <circle cx="12" cy="12" r="4.25" />
          <circle cx="17.6" cy="6.4" r="1.1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "tiktok":
      return (
        <svg aria-hidden viewBox="0 0 24 24" fill="currentColor" className={className}>
          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
        </svg>
      );
    case "whatsapp":
      // A speech bubble with a handset, the shape WhatsApp is known by.
      return (
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
        >
          <path d="M3.2 20.8l1.3-4.1A9.2 9.2 0 1 1 7.6 19.6z" />
          <path
            d="M9 8.2c.2-.5.6-.5.9-.5.2 0 .4 0 .6.4l.8 1.8c.1.2 0 .5-.1.6l-.6.7c.6 1.2 1.6 2.2 2.8 2.8l.7-.6c.2-.2.4-.2.6-.1l1.8.8c.3.2.4.4.3.7-.2.9-1 1.6-1.9 1.6C11.8 16.3 7.7 12.2 7.7 9.1c0-.4.6-.9 1.3-.9z"
            fill="currentColor"
            stroke="none"
          />
        </svg>
      );
  }
}
