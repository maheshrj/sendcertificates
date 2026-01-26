import * as Sentry from "@sentry/nextjs";

Sentry.init({
    dsn: process.env.SENTRY_DSN,

    // Set sample rate for performance monitoring
    tracesSampleRate: 0.1, // 10% of transactions

    // Only enable in production
    enabled: process.env.NODE_ENV === 'production',

    // Environment
    environment: process.env.NODE_ENV || 'development',

    // Filter out non-critical errors
    beforeSend(event, hint) {
        // Don't send info or debug level
        if (event.level === 'info' || event.level === 'debug') {
            return null;
        }

        // Filter out health check errors
        if (event.request?.url?.includes('/api/health')) {
            return null;
        }

        return event;
    },
});
