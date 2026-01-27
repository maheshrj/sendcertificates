/**
 * Batch Management Utilities
 * 
 * Provides error categorization and filtering for batch certificate management.
 * Used to determine which failed emails can be resent and which should be excluded.
 */

export enum FailureType {
    AWS_COMPLIANCE = 'aws_compliance',
    VALIDATION = 'validation',
    NETWORK = 'network',
    SYSTEM = 'system',
    UNKNOWN = 'unknown'
}

export interface CategorizedError {
    type: FailureType;
    canResend: boolean;
    displayName: string;
    description: string;
}

/**
 * Categorizes an error message into a failure type
 * and determines if the email can be resent
 */
export function categorizeError(errorMessage: string): CategorizedError {
    const error = errorMessage.toLowerCase();

    // AWS Compliance - Cannot resend
    if (
        error.includes('bounce') ||
        error.includes('suppression') ||
        error.includes('unsubscribe') ||
        error.includes('complaint') ||
        error.includes('blacklist') ||
        error.includes('suppressed')
    ) {
        return {
            type: FailureType.AWS_COMPLIANCE,
            canResend: false,
            displayName: 'AWS Compliance',
            description: 'Email bounced or on suppression list'
        };
    }

    // Validation Errors - Cannot resend
    if (
        error.includes('invalid email') ||
        error.includes('malformed') ||
        error.includes('invalid address') ||
        error.includes('invalid recipient') ||
        error.includes('does not exist') ||
        error.includes('mailbox not found')
    ) {
        return {
            type: FailureType.VALIDATION,
            canResend: false,
            displayName: 'Validation Error',
            description: 'Invalid or malformed email address'
        };
    }

    // Network Errors - Can resend
    if (
        error.includes('timeout') ||
        error.includes('network') ||
        error.includes('connection') ||
        error.includes('timed out') ||
        error.includes('connection refused') ||
        error.includes('connection reset') ||
        error.includes('econnrefused') ||
        error.includes('econnreset')
    ) {
        return {
            type: FailureType.NETWORK,
            canResend: true,
            displayName: 'Network Error',
            description: 'Temporary network or connection issue'
        };
    }

    // System Errors - Can resend
    if (
        error.includes('rate limit') ||
        error.includes('throttle') ||
        error.includes('quota') ||
        error.includes('service unavailable') ||
        error.includes('internal error') ||
        error.includes('server error') ||
        error.includes('temporary failure')
    ) {
        return {
            type: FailureType.SYSTEM,
            canResend: true,
            displayName: 'System Error',
            description: 'Temporary system or rate limit issue'
        };
    }

    // Unknown - Default to can resend (safer to allow retry)
    return {
        type: FailureType.UNKNOWN,
        canResend: true,
        displayName: 'Unknown Error',
        description: 'Unrecognized error type'
    };
}

/**
 * Filters failed emails to get only those that can be resent
 */
export function getResendableEmails(failedEmails: Array<{ error: string; data: any }>) {
    return failedEmails.filter(failed => {
        const categorized = categorizeError(failed.error);
        return categorized.canResend;
    });
}

/**
 * Groups failed emails by failure type
 */
export function groupByFailureType(failedEmails: Array<{ error: string; data: any }>) {
    const groups: Record<FailureType, Array<{ error: string; data: any }>> = {
        [FailureType.AWS_COMPLIANCE]: [],
        [FailureType.VALIDATION]: [],
        [FailureType.NETWORK]: [],
        [FailureType.SYSTEM]: [],
        [FailureType.UNKNOWN]: []
    };

    failedEmails.forEach(failed => {
        const categorized = categorizeError(failed.error);
        groups[categorized.type].push(failed);
    });

    return groups;
}

/**
 * Gets statistics about failed emails
 */
export function getFailureStats(failedEmails: Array<{ error: string; data: any }>) {
    const resendable = getResendableEmails(failedEmails);
    const groups = groupByFailureType(failedEmails);

    return {
        total: failedEmails.length,
        resendable: resendable.length,
        excluded: failedEmails.length - resendable.length,
        byType: {
            awsCompliance: groups[FailureType.AWS_COMPLIANCE].length,
            validation: groups[FailureType.VALIDATION].length,
            network: groups[FailureType.NETWORK].length,
            system: groups[FailureType.SYSTEM].length,
            unknown: groups[FailureType.UNKNOWN].length
        }
    };
}
