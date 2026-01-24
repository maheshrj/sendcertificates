import IORedis from 'ioredis';

let redis: IORedis | null = null;

// Only initialize Redis if REDIS_URL is available
if (process.env.REDIS_URL) {
    try {
        redis = new IORedis(process.env.REDIS_URL, {
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
            retryStrategy(times) {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
        });

        redis.on('error', (error) => {
            console.error('Redis connection error in ses-rate-limiter:', error);
        });

        redis.on('connect', () => {
            console.log('SES rate limiter connected to Redis');
        });
    } catch (error) {
        console.error('Failed to initialize Redis for SES rate limiter:', error);
        redis = null;
    }
} else {
    console.warn('REDIS_URL not configured - SES rate limiting will be disabled');
}

/**
 * Global SES rate limiter
 * Enforces AWS SES limits: 10 emails/second and 50,000 emails/day
 */

const SES_RATE_LIMIT_PER_SECOND = 10; // emails per second (below AWS limit of 14/sec)
const SES_DAILY_LIMIT = 50000; // emails per day

/**
 * Check if we can send an email based on global SES limits
 * @returns Object with allowed status and optional reason
 */
export async function checkSESRateLimit(): Promise<{ allowed: boolean; reason?: string }> {
    // If Redis is not available, allow the email (fallback)
    if (!redis) {
        console.warn('Redis not available - SES rate limiting disabled');
        return { allowed: true };
    }

    const now = Date.now();
    const currentSecond = Math.floor(now / 1000);
    const currentDay = new Date().toISOString().split('T')[0];

    const secondKey = `ses:rate:second:${currentSecond}`;
    const dayKey = `ses:rate:day:${currentDay}`;

    try {
        // Check per-second limit
        const secondCount = await redis.incr(secondKey);
        if (secondCount === 1) {
            await redis.expire(secondKey, 2); // Expire after 2 seconds
        }
        if (secondCount > SES_RATE_LIMIT_PER_SECOND) {
            return {
                allowed: false,
                reason: `Global SES rate limit exceeded (${SES_RATE_LIMIT_PER_SECOND}/sec)`,
            };
        }

        // Check per-day limit
        const dayCount = await redis.incr(dayKey);
        if (dayCount === 1) {
            await redis.expire(dayKey, 86400); // Expire after 24 hours
        }
        if (dayCount > SES_DAILY_LIMIT) {
            return {
                allowed: false,
                reason: `Daily SES quota exceeded (${SES_DAILY_LIMIT}/day)`,
            };
        }

        return { allowed: true };
    } catch (error) {
        console.error('Error checking SES rate limit:', error);
        // On Redis error, allow the email to prevent blocking legitimate sends
        return { allowed: true };
    }
}

/**
 * Get current SES email count
 * @returns Object with per-second and per-day counts
 */
export async function getSESEmailCount(): Promise<{
    perSecond: number;
    perDay: number;
    perSecondLimit: number;
    perDayLimit: number;
}> {
    // If Redis is not available, return zero counts
    if (!redis) {
        return {
            perSecond: 0,
            perDay: 0,
            perSecondLimit: SES_RATE_LIMIT_PER_SECOND,
            perDayLimit: SES_DAILY_LIMIT,
        };
    }

    const now = Date.now();
    const currentSecond = Math.floor(now / 1000);
    const currentDay = new Date().toISOString().split('T')[0];

    const secondKey = `ses:rate:second:${currentSecond}`;
    const dayKey = `ses:rate:day:${currentDay}`;

    try {
        const [perSecond, perDay] = await Promise.all([
            redis.get(secondKey).then((v) => parseInt(v || '0')),
            redis.get(dayKey).then((v) => parseInt(v || '0')),
        ]);

        return {
            perSecond,
            perDay,
            perSecondLimit: SES_RATE_LIMIT_PER_SECOND,
            perDayLimit: SES_DAILY_LIMIT,
        };
    } catch (error) {
        console.error('Error getting SES email count:', error);
        return {
            perSecond: 0,
            perDay: 0,
            perSecondLimit: SES_RATE_LIMIT_PER_SECOND,
            perDayLimit: SES_DAILY_LIMIT,
        };
    }
}

/**
 * Reset SES rate limit (admin function)
 * @param type - 'second' | 'day' | 'all'
 */
export async function resetSESRateLimit(
    type: 'second' | 'day' | 'all' = 'all'
): Promise<void> {
    // If Redis is not available, do nothing
    if (!redis) {
        console.warn('Redis not available - cannot reset SES rate limit');
        return;
    }

    const now = Date.now();
    const currentSecond = Math.floor(now / 1000);
    const currentDay = new Date().toISOString().split('T')[0];

    try {
        if (type === 'second' || type === 'all') {
            const secondKey = `ses:rate:second:${currentSecond}`;
            await redis.del(secondKey);
        }

        if (type === 'day' || type === 'all') {
            const dayKey = `ses:rate:day:${currentDay}`;
            await redis.del(dayKey);
        }
    } catch (error) {
        console.error('Error resetting SES rate limit:', error);
    }
}

export default redis;
