import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

// Sent on every response. No script-src CSP yet: Stripe, Cloudinary, Firebase
// and Google sign-in each need allow-listing, and inline scripts need nonces.
const securityHeaders = [
  // Nobody may frame the site (clickjacking on /admin, checkout, account).
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  // Keeps window.opener for the Google sign-in popup.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  // Browsers ignore this over plain http, so it only takes effect once HTTPS is
  // live. No `preload`: that's a hard-to-undo commitment for the whole domain.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // The "Work" gallery was renamed "Community" (2026-11-09); old links and
  // shared posts keep working.
  async redirects() {
    return [
      { source: "/work", destination: "/community", permanent: true },
      { source: "/work/:slug", destination: "/community/:slug", permanent: true },
      { source: "/admin/portfolio", destination: "/admin/community", permanent: true },
      {
        source: "/admin/portfolio/:path*",
        destination: "/admin/community/:path*",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    remotePatterns: [new URL("https://res.cloudinary.com/syeq4d4c/**")],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withSentryConfig(nextConfig, {
  org: "trulylockedin",
  project: "truly-lockedin",
  // Build-time secret for source map uploads. Without it the build still works,
  // it just skips the upload.
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  // Browser events go through /monitoring on our own domain, so ad blockers
  // don't drop them.
  tunnelRoute: "/monitoring",
  silent: !process.env.CI,
});
