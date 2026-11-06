import type { init } from "@sentry/nextjs";

type SentryOptions = NonNullable<Parameters<typeof init>[0]>;

// Shared by the browser, server and edge Sentry configs. Sentry 11 collects
// user info, cookies, headers and bodies by default; this site
// handles client names, emails, phones, addresses and booking/payment tokens
// (in query strings and cookies), so all of that is switched off.
export const sentryDataCollection: SentryOptions["dataCollection"] = {
  userInfo: false,
  cookies: false,
  httpHeaders: false,
  httpBodies: [],
  urlQueryParams: false,
  databaseQueryData: false,
};

export const sentryEnvironment =
  process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NODE_ENV;

// 100% of traces in development, 10% in production.
export const sentryTracesSampleRate =
  process.env.NODE_ENV === "development" ? 1.0 : 0.1;
