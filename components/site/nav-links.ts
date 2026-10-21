export const NAV_LINKS = [
  { href: "/work", label: "Work" },
  { href: "/services", label: "Services" },
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;

// A section stays active on its sub-pages (/work/some-look → Work).
export function isActivePath(pathname: string | null, href: string): boolean {
  return pathname === href || !!pathname?.startsWith(`${href}/`);
}
