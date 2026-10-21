"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";

import { isActivePath, NAV_LINKS } from "./nav-links";

function subscribeScroll(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}

// Transparent at the top of the page, solid once the page has scrolled.
export function HeaderFrame({ children }: { children: React.ReactNode }) {
  const scrolled = useSyncExternalStore(
    subscribeScroll,
    () => window.scrollY > 8,
    () => false,
  );
  return (
    <header
      className={`fixed inset-x-0 top-0 z-30 border-b transition-colors duration-300 ${
        scrolled ? "border-brown bg-espresso" : "border-transparent"
      }`}
    >
      {children}
    </header>
  );
}

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
            ? "text-cream after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-gold"
            : "text-sand hover:text-cream"
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
