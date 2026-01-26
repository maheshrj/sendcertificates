import {
    categorizeError,
    getUserFriendlyMessage,
    getErrorSuggestion,
    createErrorDetails,
    ErrorCategory,
} from '../error-handler';

describe('Error Handler', () => {
    describe('categorizeError', () => {
        it('should categorize validation errors', () => {
            const error = new Error('Invalid email address');
            expect(categorizeError(error)).toBe(ErrorCategory.VALIDATION);
        });

        it('should categorize malformed data errors', () => {
            const error = new Error('malformed request');
            expect(categorizeError(error)).toBe(ErrorCategory.VALIDATION);
        });

        it('should categorize missing field errors', () => {
            const error = new Error('missing required field');
            expect(categorizeError(error)).toBe(ErrorCategory.VALIDATION);
        });

        it('should categorize suppression list errors', () => {
            const error = new Error('Email in suppression list');
            expect(categorizeError(error)).toBe(ErrorCategory.SUPPRESSION);
        });

        it('should categorize bounce errors', () => {
            const error = new Error('Email bounced');
            expect(categorizeError(error)).toBe(ErrorCategory.SUPPRESSION);
        });

        it('should categorize rate limit errors', () => {
            const error = new Error('Rate limit exceeded');
            expect(categorizeError(error)).toBe(ErrorCategory.RATE_LIMIT);
        });

        it('should categorize throttling errors', () => {
            const error = { message: 'throttled', code: 'Throttling' };
            expect(categorizeError(error)).toBe(ErrorCategory.RATE_LIMIT);
        });

        it('should categorize AWS SES errors', () => {
            const error = new Error('SES service error');
            expect(categorizeError(error)).toBe(ErrorCategory.AWS_SES);
        });

        it('should categorize network errors', () => {
            const error = new Error('Connection timeout');
            expect(categorizeError(error)).toBe(ErrorCategory.NETWORK);
        });

        it('should categorize ECONNREFUSED errors', () => {
            const error = new Error('ECONNREFUSED');
            expect(categorizeError(error)).toBe(ErrorCategory.NETWORK);
        });

        it('should categorize template errors', () => {
            const error = new Error('Template rendering failed');
            expect(categorizeError(error)).toBe(ErrorCategory.TEMPLATE);
        });

        it('should categorize storage errors', () => {
            const error = new Error('S3 upload failed');
            expect(categorizeError(error)).toBe(ErrorCategory.STORAGE);
        });

        it('should categorize unknown errors', () => {
            const error = new Error('Some random error');
            expect(categorizeError(error)).toBe(ErrorCategory.UNKNOWN);
        });
    });

    describe('getUserFriendlyMessage', () => {
        it('should return friendly message for validation errors', () => {
            const message = getUserFriendlyMessage(ErrorCategory.VALIDATION);
            expect(message).toContain('Invalid email');
        });

        it('should return friendly message for AWS SES errors', () => {
            const message = getUserFriendlyMessage(ErrorCategory.AWS_SES);
            expect(message).toContain('Email service');
        });

        it('should return friendly message for network errors', () => {
            const message = getUserFriendlyMessage(ErrorCategory.NETWORK);
            expect(message).toContain('Network');
        });

        it('should return friendly message for suppression errors', () => {
            const message = getUserFriendlyMessage(ErrorCategory.SUPPRESSION);
            expect(message).toContain('unsubscribed');
        });

        it('should return friendly message for rate limit errors', () => {
            const message = getUserFriendlyMessage(ErrorCategory.RATE_LIMIT);
            expect(message).toContain('limit');
        });

        it('should return friendly message for unknown errors', () => {
            const message = getUserFriendlyMessage(ErrorCategory.UNKNOWN);
            expect(message).toContain('unexpected');
        });
    });

    describe('getErrorSuggestion', () => {
        it('should return suggestion for validation errors', () => {
            const suggestion = getErrorSuggestion(ErrorCategory.VALIDATION);
            expect(suggestion).toContain('Check');
            expect(suggestion.length).toBeGreaterThan(10);
        });

        it('should return suggestion for rate limit errors', () => {
            const suggestion = getErrorSuggestion(ErrorCategory.RATE_LIMIT);
            expect(suggestion).toContain('Wait');
        });

        it('should return suggestion for network errors', () => {
            const suggestion = getErrorSuggestion(ErrorCategory.NETWORK);
            expect(suggestion).toContain('connection');
        });
    });

    describe('createErrorDetails', () => {
        it('should create error details with all fields', () => {
            const error = new Error('Test error');
            const context = {
                email: 'test@example.com',
                batchId: 'batch123',
                certificateId: 'cert456',
                additionalContext: { foo: 'bar' },
            };

            const details = createErrorDetails(error, context);

            expect(details.email).toBe('test@example.com');
            expect(details.batchId).toBe('batch123');
            expect(details.certificateId).toBe('cert456');
            expect(details.message).toBe('Test error');
            expect(details.category).toBeDefined();
            expect(details.userMessage).toBeDefined();
            expect(details.timestamp).toBeDefined();
            expect(details.context).toEqual({ foo: 'bar' });
        });

        it('should handle missing context fields', () => {
            const error = new Error('Test error');
            const details = createErrorDetails(error, {});

            expect(details.email).toBeUndefined();
            expect(details.batchId).toBeUndefined();
            expect(details.certificateId).toBeUndefined();
            expect(details.message).toBe('Test error');
        });

        it('should categorize error correctly', () => {
            const error = new Error('Invalid email address');
            const details = createErrorDetails(error, {});

            expect(details.category).toBe(ErrorCategory.VALIDATION);
            expect(details.userMessage).toContain('Invalid email');
        });

        it('should include timestamp', () => {
            const error = new Error('Test error');
            const details = createErrorDetails(error, {});

            expect(details.timestamp).toBeDefined();
            expect(new Date(details.timestamp).toString()).not.toBe('Invalid Date');
        });

        it('should include stack trace', () => {
            const error = new Error('Test error');
            const details = createErrorDetails(error, {});

            expect(details.stack).toBeDefined();
            expect(details.stack).toContain('Error: Test error');
        });
    });
});
