import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Test endpoint to verify Sentry error tracking
 * This will send a test error to Sentry
 */
export async function GET() {
    try {
        // Throw a test error
        throw new Error('Test error from Sentry verification endpoint');
    } catch (error: any) {
        // Log to Sentry if configured
        if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
            const Sentry = require('@sentry/nextjs');
            Sentry.captureException(error, {
                level: 'error',
                tags: {
                    test: 'sentry-verification',
                    endpoint: '/api/test-sentry'
                },
                extra: {
                    message: 'This is a test error to verify Sentry integration',
                    timestamp: new Date().toISOString()
                }
            });
        }

        return NextResponse.json({
            success: true,
            message: 'Test error sent to Sentry',
            sentryEnabled: !!(process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN),
            error: error.message
        });
    }
}
