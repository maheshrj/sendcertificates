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
            console.error('Redis connection error in rate-limiter:', error);
        });

        redis.on('connect', () => {
            console.log('Rate limiter connected to Redis');
        });
    } catch (error) {
        console.error('Failed to initialize Redis:', error);
        redis = null;
    }
} else {
    console.warn('REDIS_URL not configured - rate limiting will be disabled');
}

/**
 * Check if a user can send an email based on their rate limits
 * @param userId - User ID
 * @param emailsPerSecond - Maximum emails per second for this user
 * @param emailsPerDay - Maximum emails per day for this user
 * @returns Object with allowed status and optional reason
 */
export async function checkUserRateLimit(
    userId: string,
    emailsPerSecond: number,
    emailsPerDay: number
): Promise<{ allowed: boolean; reason?: string }> {
    // If Redis is not available, allow the email
    if (!redis) {
        console.warn('Redis not available - rate limiting disabled');
        return { allowed: true };
    }

    const now = Date.now();
    const currentSecond = Math.floor(now / 1000);
    const currentDay = new Date().toISOString().split('T')[0];

    const secondKey = `rate:${userId}:second:${currentSecond}`;
    const dayKey = `rate:${userId}:day:${currentDay}`;

    try {
        // Check per-second limit
        const secondCount = await redis.incr(secondKey);
        if (secondCount === 1) {
            await redis.expire(secondKey, 2); // Expire after 2 seconds
        }
        if (secondCount > emailsPerSecond) {
            return {
                allowed: false,
                reason: `Per-second rate limit exceeded (${emailsPerSecond}/sec)`
            };
        }

        // Check per-day limit
        const dayCount = await redis.incr(dayKey);
        if (dayCount === 1) {
            await redis.expire(dayKey, 86400); // Expire after 24 hours
        }
        if (dayCount > emailsPerDay) {
            return {
                allowed: false,
                reason: `Daily rate limit exceeded (${emailsPerDay}/day)`
            };
        }

        return { allowed: true };
    } catch (error) {
        console.error('Error checking rate limit:', error);
        // On Redis error, allow the email to prevent blocking legitimate sends
        return { allowed: true };
    }
}

/**
 * Get current email count for a user
 * @param userId - User ID
 * @returns Object with per-second and per-day counts
 */
export async function getUserEmailCount(userId: string): Promise<{
    perSecond: number;
    perDay: number;
}> {
    // If Redis is not available, return zero counts
    if (!redis) {
        return { perSecond: 0, perDay: 0 };
    }

    const now = Date.now();
    const currentSecond = Math.floor(now / 1000);
    const currentDay = new Date().toISOString().split('T')[0];

    const secondKey = `rate:${userId}:second:${currentSecond}`;
    const dayKey = `rate:${userId}:day:${currentDay}`;

    try {
        const [perSecond, perDay] = await Promise.all([
            redis.get(secondKey).then((v) => parseInt(v || '0')),
            redis.get(dayKey).then((v) => parseInt(v || '0')),
        ]);

        return { perSecond, perDay };
    } catch (error) {
        console.error('Error getting email count:', error);
        return { perSecond: 0, perDay: 0 };
    }
}

/**
 * Reset rate limit for a user (admin function)
 * @param userId - User ID
 * @param type - 'second' | 'day' | 'all'
 */
export async function resetUserRateLimit(
    userId: string,
    type: 'second' | 'day' | 'all' = 'all'
): Promise<void> {
    // If Redis is not available, do nothing
    if (!redis) {
        console.warn('Redis not available - cannot reset rate limit');
        return;
    }

    const now = Date.now();
    const currentSecond = Math.floor(now / 1000);
    const currentDay = new Date().toISOString().split('T')[0];

    try {
        if (type === 'second' || type === 'all') {
            const secondKey = `rate:${userId}:second:${currentSecond}`;
            await redis.del(secondKey);
        }

        if (type === 'day' || type === 'all') {
            const dayKey = `rate:${userId}:day:${currentDay}`;
            await redis.del(dayKey);
        }
    } catch (error) {
        console.error('Error resetting rate limit:', error);
    }
}

export default redis;
