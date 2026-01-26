/**
 * Error handling utilities for certificate generation
 */

export enum ErrorCategory {
    VALIDATION = 'validation',
    AWS_SES = 'aws_ses',
    NETWORK = 'network',
    SUPPRESSION = 'suppression',
    RATE_LIMIT = 'rate_limit',
    TEMPLATE = 'template',
    STORAGE = 'storage',
    UNKNOWN = 'unknown'
}

export interface ErrorDetails {
    timestamp: string;
    category: ErrorCategory;
    message: string;
    userMessage: string;
    email?: string;
    batchId?: string;
    certificateId?: string;
    context?: Record<string, any>;
    stack?: string;
}

/**
 * Categorize error based on error message and type
 */
export function categorizeError(error: any): ErrorCategory {
    const message = error.message?.toLowerCase() || '';
    const code = error.code?.toLowerCase() || '';

    // Validation errors
    if (message.includes('invalid email') ||
        message.includes('malformed') ||
        message.includes('missing') ||
        message.includes('required field')) {
        return ErrorCategory.VALIDATION;
    }

    // Suppression list errors
    if (message.includes('suppression') ||
        message.includes('bounce') ||
        message.includes('unsubscribe')) {
        return ErrorCategory.SUPPRESSION;
    }

    // Rate limit errors
    if (message.includes('rate') ||
        message.includes('throttl') ||
        message.includes('limit exceeded') ||
        code.includes('throttling')) {
        return ErrorCategory.RATE_LIMIT;
    }

    // AWS SES errors
    if (message.includes('ses') ||
        message.includes('aws') ||
        message.includes('smtp') ||
        code.includes('messagerejected')) {
        return ErrorCategory.AWS_SES;
    }

    // Network errors
    if (message.includes('timeout') ||
        message.includes('network') ||
        message.includes('econnrefused') ||
        message.includes('enotfound')) {
        return ErrorCategory.NETWORK;
    }

    // Template errors
    if (message.includes('template') ||
        message.includes('canvas') ||
        message.includes('image')) {
        return ErrorCategory.TEMPLATE;
    }

    // Storage errors
    if (message.includes('s3') ||
        message.includes('upload') ||
        message.includes('storage')) {
        return ErrorCategory.STORAGE;
    }

    return ErrorCategory.UNKNOWN;
}

/**
 * Get user-friendly error message based on category
 */
export function getUserFriendlyMessage(category: ErrorCategory, originalMessage?: string): string {
    const messages: Record<ErrorCategory, string> = {
        [ErrorCategory.VALIDATION]: 'Invalid email address or missing required data',
        [ErrorCategory.AWS_SES]: 'Email service temporarily unavailable. Please try again',
        [ErrorCategory.NETWORK]: 'Network connection issue. Please check your internet',
        [ErrorCategory.SUPPRESSION]: 'Recipient has unsubscribed or email previously bounced',
        [ErrorCategory.RATE_LIMIT]: 'Sending limit reached. Please wait a moment and try again',
        [ErrorCategory.TEMPLATE]: 'Certificate template error. Please contact support',
        [ErrorCategory.STORAGE]: 'File storage error. Please try again',
        [ErrorCategory.UNKNOWN]: 'An unexpected error occurred. Please try again'
    };

    return messages[category] || messages[ErrorCategory.UNKNOWN];
}

/**
 * Get actionable suggestion for user based on error category
 */
export function getErrorSuggestion(category: ErrorCategory): string {
    const suggestions: Record<ErrorCategory, string> = {
        [ErrorCategory.VALIDATION]: 'Check the email address format and ensure all required fields are filled',
        [ErrorCategory.AWS_SES]: 'Wait a few minutes and try again. If the problem persists, contact support',
        [ErrorCategory.NETWORK]: 'Check your internet connection and try again',
        [ErrorCategory.SUPPRESSION]: 'This email cannot receive certificates. Contact the recipient to resubscribe',
        [ErrorCategory.RATE_LIMIT]: 'Wait 1-2 minutes before sending more emails',
        [ErrorCategory.TEMPLATE]: 'Contact support with the batch ID for assistance',
        [ErrorCategory.STORAGE]: 'Try again in a few moments',
        [ErrorCategory.UNKNOWN]: 'If this persists, contact support with the error details'
    };

    return suggestions[category] || suggestions[ErrorCategory.UNKNOWN];
}

/**
 * Create detailed error object for logging
 */
export function createErrorDetails(
    error: any,
    context: {
        email?: string;
        batchId?: string;
        certificateId?: string;
        additionalContext?: Record<string, any>;
    }
): ErrorDetails {
    const category = categorizeError(error);

    return {
        timestamp: new Date().toISOString(),
        category,
        message: error.message || 'Unknown error',
        userMessage: getUserFriendlyMessage(category, error.message),
        email: context.email,
        batchId: context.batchId,
        certificateId: context.certificateId,
        context: context.additionalContext,
        stack: error.stack
    };
}

/**
 * Log error with full context
 */
export function logError(errorDetails: ErrorDetails): void {
    console.error('[CERT_ERROR]', JSON.stringify({
        ...errorDetails,
        // Don't log full stack in production for cleaner logs
        stack: process.env.NODE_ENV === 'development' ? errorDetails.stack : undefined
    }, null, 2));

    // Send to Sentry in production
    if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
        try {
            const Sentry = require('@sentry/nextjs');

            Sentry.captureException(new Error(errorDetails.message), {
                level: 'error',
                tags: {
                    category: errorDetails.category,
                    batchId: errorDetails.batchId || 'unknown',
                    errorType: 'certificate_generation'
                },
                extra: {
                    email: errorDetails.email,
                    certificateId: errorDetails.certificateId,
                    userMessage: errorDetails.userMessage,
                    context: errorDetails.context,
                    timestamp: errorDetails.timestamp
                },
                fingerprint: [errorDetails.category, errorDetails.message]
            });
        } catch (sentryError) {
            console.error('Failed to send error to Sentry:', sentryError);
        }
    }
}

/**
 * Format error for API response
 */
export function formatErrorResponse(errorDetails: ErrorDetails) {
    return {
        error: true,
        category: errorDetails.category,
        message: errorDetails.userMessage,
        suggestion: getErrorSuggestion(errorDetails.category),
        timestamp: errorDetails.timestamp,
        // Include these for debugging (can be removed in production)
        details: process.env.NODE_ENV === 'development' ? {
            originalMessage: errorDetails.message,
            context: errorDetails.context
        } : undefined
    };
}
