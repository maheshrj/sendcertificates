// lib/rateLimiter.ts
import { NextResponse } from 'next/server';
import IORedis from 'ioredis';

const redis = new IORedis(process.env.REDIS_URL!);

interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number; 
}

export async function rateLimiter(ip: string): Promise<RateLimitResult> {
  const limit = 10; // Max requests
  const windowMs = 1000; // 1 second

  const key = `rate-limit:${ip}`;

  // Use Redis INCR and TTL to track count
  const count = await redis.incr(key);
  
  if (count === 1) {
    // first request, set expiry
    await redis.expire(key, windowMs / 1000);
  }

  if (count > limit) {
    const ttl = await redis.ttl(key);
    return {
      allowed: false,
      retryAfter: ttl > 0 ? ttl : 1
    };
  }

  return { allowed: true };
}
