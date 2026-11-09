"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const ADMIN_NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/members", label: "Members" },
  { href: "/admin/availability", label: "Availability" },
  { href: "/admin/services", label: "Services" },
  { href: "/admin/community", label: "Community" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/content", label: "Content" },
] as const;

export function isActive(pathname: string | null, href: string): boolean {
  if (href === "/admin") return pathname === href;
  return pathname === href || !!pathname?.startsWith(`${href}/`);
}

export function AdminNavItems({ pathname }: { pathname: string | null }) {
  return ADMIN_NAV.map(({ href, label }) => {
    const active = isActive(pathname, href);
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={`-mb-px inline-flex min-h-11 shrink-0 items-center border-b-2 text-sm tracking-wide transition-colors ${
          active
            ? "border-brand text-ink"
            : "border-transparent text-muted hover:text-ink"
        }`}
      >
        {label}
      </Link>
    );
  });
}

// usePathname suspends while prerendering pages with unknown params (e.g.
// /admin/bookings/[id]), so the layout wraps this in Suspense with
// <AdminNavItems> as the fallback.
export function CurrentAdminNavItems() {
  return <AdminNavItems pathname={usePathname()} />;
}
