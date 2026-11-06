import * as Sentry from "@sentry/nextjs";

import {
  sentryDataCollection,
  sentryEnvironment,
  sentryTracesSampleRate,
} from "@/lib/sentry-options";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: sentryEnvironment,
  dataCollection: sentryDataCollection,
  tracesSampleRate: sentryTracesSampleRate,

  // Session Replay: 10% of sessions, 100% of sessions with an error. All text,
  // inputs and media are masked/blocked, so names, phones and addresses typed
  // into the booking or checkout forms never leave the browser.
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      maskAllInputs: true,
      blockAllMedia: true,
    }),
  ],
});

// App Router navigation spans.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
