import { UserRound } from "lucide-react";
import Link from "next/link";

// Static on purpose: it doesn't read the session, so public pages stay
// prerendered. /account shows the sign-in form or the member's page.
export function AccountLink() {
  return (
    <Link
      href="/account"
      aria-label="Your account"
      className="relative z-50 inline-flex min-h-11 min-w-11 items-center justify-center text-ink transition-colors hover:text-brand"
    >
      <UserRound aria-hidden className="size-5" />
    </Link>
  );
}
