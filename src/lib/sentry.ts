/**
 * Sentry error monitoring initialisation.
 * Only enabled when VITE_SENTRY_DSN is set in the environment.
 */

export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  // Dynamic import to avoid loading Sentry when DSN is not configured
  import("@sentry/react").then((Sentry) => {
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      tracesSampleRate: import.meta.env.PROD ? 0.1 : 0,
      integrations: [Sentry.browserTracingIntegration()],
    });
  });
}
