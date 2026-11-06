import * as Sentry from "@sentry/nextjs";

import {
  sentryDataCollection,
  sentryEnvironment,
  sentryTracesSampleRate,
} from "@/lib/sentry-options";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: sentryEnvironment,
  dataCollection: sentryDataCollection,
  tracesSampleRate: sentryTracesSampleRate,
});
