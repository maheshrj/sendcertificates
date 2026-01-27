import { categorizeError, getResendableEmails, getFailureStats, FailureType } from '../batch-utils';

describe('Batch Utils - Error Categorization', () => {
    describe('categorizeError', () => {
        it('should categorize AWS compliance errors correctly', () => {
            const errors = [
                'Email bounced',
                'Address is on suppression list',
                'User unsubscribed',
                'Complaint received',
            ];

            errors.forEach(error => {
                const result = categorizeError(error);
                expect(result.type).toBe(FailureType.AWS_COMPLIANCE);
                expect(result.canResend).toBe(false);
            });
        });

        it('should categorize validation errors correctly', () => {
            const errors = [
                'Invalid email address',
                'Malformed email',
                'Mailbox not found',
                'Address does not exist',
            ];

            errors.forEach(error => {
                const result = categorizeError(error);
                expect(result.type).toBe(FailureType.VALIDATION);
                expect(result.canResend).toBe(false);
            });
        });

        it('should categorize network errors correctly', () => {
            const errors = [
                'Connection timeout',
                'Network error',
                'ECONNREFUSED',
                'Connection reset',
            ];

            errors.forEach(error => {
                const result = categorizeError(error);
                expect(result.type).toBe(FailureType.NETWORK);
                expect(result.canResend).toBe(true);
            });
        });

        it('should categorize system errors correctly', () => {
            const errors = [
                'Rate limit exceeded',
                'Service unavailable',
                'Internal server error',
                'Temporary failure',
            ];

            errors.forEach(error => {
                const result = categorizeError(error);
                expect(result.type).toBe(FailureType.SYSTEM);
                expect(result.canResend).toBe(true);
            });
        });

        it('should categorize unknown errors as resendable', () => {
            const result = categorizeError('Some random error');
            expect(result.type).toBe(FailureType.UNKNOWN);
            expect(result.canResend).toBe(true);
        });
    });

    describe('getResendableEmails', () => {
        it('should filter out non-resendable emails', () => {
            const failedEmails = [
                { error: 'Email bounced', data: { email: 'bounce@test.com' } },
                { error: 'Network timeout', data: { email: 'timeout@test.com' } },
                { error: 'Invalid email', data: { email: 'invalid@test.com' } },
                { error: 'Rate limit', data: { email: 'rate@test.com' } },
            ];

            const resendable = getResendableEmails(failedEmails);
            expect(resendable).toHaveLength(2);
            expect(resendable[0].data.email).toBe('timeout@test.com');
            expect(resendable[1].data.email).toBe('rate@test.com');
        });
    });

    describe('getFailureStats', () => {
        it('should calculate correct statistics', () => {
            const failedEmails = [
                { error: 'Email bounced', data: {} },
                { error: 'Email bounced', data: {} },
                { error: 'Network timeout', data: {} },
                { error: 'Invalid email', data: {} },
                { error: 'Rate limit', data: {} },
            ];

            const stats = getFailureStats(failedEmails);
            expect(stats.total).toBe(5);
            expect(stats.resendable).toBe(2);
            expect(stats.excluded).toBe(3);
            expect(stats.byType.awsCompliance).toBe(2);
            expect(stats.byType.validation).toBe(1);
            expect(stats.byType.network).toBe(1);
            expect(stats.byType.system).toBe(1);
        });
    });
});
