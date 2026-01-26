import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import IORedis from 'ioredis';

export const dynamic = 'force-dynamic';

interface HealthCheck {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    uptime: number;
    checks: {
        database: 'healthy' | 'unhealthy' | 'unknown';
        redis: 'healthy' | 'unhealthy' | 'unknown';
        queue: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
    };
    details?: {
        queueLength?: number;
        databaseLatency?: number;
        redisLatency?: number;
    };
}

export async function GET() {
    const startTime = Date.now();

    const health: HealthCheck = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        checks: {
            database: 'unknown',
            redis: 'unknown',
            queue: 'unknown'
        },
        details: {}
    };

    // Check database
    try {
        const dbStart = Date.now();
        await prisma.$queryRaw`SELECT 1`;
        const dbLatency = Date.now() - dbStart;

        health.checks.database = 'healthy';
        health.details!.databaseLatency = dbLatency;

        if (dbLatency > 1000) {
            health.status = 'degraded';
        }
    } catch (error) {
        console.error('Health check - Database error:', error);
        health.checks.database = 'unhealthy';
        health.status = 'unhealthy';
    }

    // Check Redis
    if (process.env.REDIS_URL) {
        let redis: IORedis | null = null;
        try {
            const redisStart = Date.now();
            redis = new IORedis(process.env.REDIS_URL, {
                connectTimeout: 5000,
                maxRetriesPerRequest: 1
            });

            await redis.ping();
            const redisLatency = Date.now() - redisStart;

            health.checks.redis = 'healthy';
            health.details!.redisLatency = redisLatency;

            if (redisLatency > 1000) {
                health.status = 'degraded';
            }
        } catch (error) {
            console.error('Health check - Redis error:', error);
            health.checks.redis = 'unhealthy';
            health.status = 'degraded'; // Redis is not critical, just degraded
        } finally {
            if (redis) {
                await redis.quit();
            }
        }
    } else {
        health.checks.redis = 'unknown';
    }

    // Check queue (if Redis is healthy)
    if (health.checks.redis === 'healthy' && process.env.REDIS_URL) {
        let redis: IORedis | null = null;
        try {
            redis = new IORedis(process.env.REDIS_URL, {
                connectTimeout: 5000,
                maxRetriesPerRequest: 1
            });

            const queueLength = await redis.llen('bull:emailQueue:wait');
            health.details!.queueLength = queueLength;

            if (queueLength < 1000) {
                health.checks.queue = 'healthy';
            } else if (queueLength < 5000) {
                health.checks.queue = 'degraded';
                health.status = 'degraded';
            } else {
                health.checks.queue = 'unhealthy';
                health.status = 'degraded';
            }
        } catch (error) {
            console.error('Health check - Queue error:', error);
            health.checks.queue = 'unhealthy';
        } finally {
            if (redis) {
                await redis.quit();
            }
        }
    } else {
        health.checks.queue = 'unknown';
    }

    // Determine final status code
    const statusCode = health.status === 'healthy' ? 200 :
        health.status === 'degraded' ? 200 : 503;

    return NextResponse.json(health, { status: statusCode });
}
