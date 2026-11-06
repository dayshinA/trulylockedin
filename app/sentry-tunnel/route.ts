// Handler for the Sentry tunnelRoute (/monitoring in next.config.ts). Forwards
// only the event payload to Sentry, not the request headers, so the admin and
// member session cookies never leave our server.
export { POST } from "@sentry/nextjs/tunnel";
