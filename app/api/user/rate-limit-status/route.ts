import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import { getUserEmailCount } from '@/app/lib/rate-limiter';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;

function getUserIdFromRequest(request: Request): string | null {
    const token = request.headers
        .get('cookie')
        ?.split('; ')
        .find((c) => c.startsWith('token='))
        ?.split('=')[1];
    if (!token) return null;

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        return decoded.userId;
    } catch {
        return null;
    }
}

// GET /api/user/rate-limit-status
export async function GET(request: Request) {
    try {
        const userId = getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                emailRateLimit: true,
                emailDailyLimit: true,
            },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const usage = await getUserEmailCount(userId);

        return NextResponse.json({
            limits: {
                perSecond: user.emailRateLimit,
                perDay: user.emailDailyLimit,
            },
            usage: {
                perSecond: usage.perSecond,
                perDay: usage.perDay,
            },
            remaining: {
                perSecond: Math.max(0, user.emailRateLimit - usage.perSecond),
                perDay: Math.max(0, user.emailDailyLimit - usage.perDay),
            },
        });
    } catch (error) {
        console.error('Error fetching rate limit status:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal Server Error' },
            { status: 500 }
        );
    }
}
