import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
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

// GET /api/admin/user-rate-limits - List all users with their rate limits
export async function GET(request: Request) {
    try {
        const userId = getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { is_admin: true },
        });

        if (!user?.is_admin) {
            return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
        }

        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                emailRateLimit: true,
                emailDailyLimit: true,
                createdAt: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return NextResponse.json({ users });
    } catch (error) {
        console.error('Error fetching user rate limits:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal Server Error' },
            { status: 500 }
        );
    }
}

// PUT /api/admin/user-rate-limits - Update user rate limits
export async function PUT(request: Request) {
    try {
        const userId = getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { is_admin: true },
        });

        if (!user?.is_admin) {
            return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
        }

        const { targetUserId, emailRateLimit, emailDailyLimit } = await request.json();

        if (!targetUserId) {
            return NextResponse.json({ error: 'Target user ID is required' }, { status: 400 });
        }

        if (emailRateLimit !== undefined && (emailRateLimit < 1 || emailRateLimit > 14)) {
            return NextResponse.json(
                { error: 'Email rate limit must be between 1 and 14 emails/sec' },
                { status: 400 }
            );
        }

        if (emailDailyLimit !== undefined && emailDailyLimit < 1) {
            return NextResponse.json(
                { error: 'Daily email limit must be at least 1' },
                { status: 400 }
            );
        }

        const updatedUser = await prisma.user.update({
            where: { id: targetUserId },
            data: {
                ...(emailRateLimit !== undefined && { emailRateLimit }),
                ...(emailDailyLimit !== undefined && { emailDailyLimit }),
            },
        });

        return NextResponse.json({
            message: 'Rate limits updated successfully',
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                emailRateLimit: updatedUser.emailRateLimit,
                emailDailyLimit: updatedUser.emailDailyLimit,
            },
        });
    } catch (error) {
        console.error('Error updating user rate limits:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal Server Error' },
            { status: 500 }
        );
    }
}
