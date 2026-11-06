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
  // Failed emails, refunds, webhook steps and Cloudinary deletes are caught and
  // logged with console.error so the customer never sees a crash. This turns
  // each of those logs into a Sentry issue, so they still raise an alert.
  integrations: [Sentry.captureConsoleIntegration({ levels: ["error"] })],
});
