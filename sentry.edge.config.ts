import * as Sentry from "@sentry/nextjs";

export default Sentry.withSentryConfig(
    {},
    {
        // Sentry Webpack Plugin options
        silent: true,
        org: "your-org",
        project: "certificate-app",
    },
    {
        // Upload source maps for better error tracking
        widenClientFileUpload: true,
        transpileClientSDK: true,
        tunnelRoute: "/monitoring",
        hideSourceMaps: true,
        disableLogger: true,
    }
);
