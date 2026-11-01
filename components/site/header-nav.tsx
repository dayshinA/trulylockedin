"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { isActivePath, NAV_LINKS } from "./nav-links";

export function NavItems({ pathname }: { pathname: string | null }) {
  return NAV_LINKS.map(({ href, label }) => {
    const active = isActivePath(pathname, href);
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={`relative py-2 text-sm tracking-wide transition-colors ${
          active
            ? "text-ink after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-brand"
            : "text-muted hover:text-ink"
        }`}
      >
        {label}
      </Link>
    );
  });
}

// usePathname suspends while prerendering pages with unknown params (e.g.
// /work/[slug]), so the header wraps this in Suspense with <NavItems> as the
// fallback.
export function CurrentNavItems() {
  return <NavItems pathname={usePathname()} />;
}
