import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import jwt from 'jsonwebtoken';

function getUserIdFromRequest(request: Request): string | null {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        const cookieHeader = request.headers.get('cookie');
        if (!cookieHeader) return null;

        const tokenMatch = cookieHeader.match(/token=([^;]+)/);
        if (!tokenMatch) return null;

        try {
            const decoded = jwt.verify(tokenMatch[1], process.env.JWT_SECRET!) as { userId: string };
            return decoded.userId;
        } catch {
            return null;
        }
    }

    const token = authHeader.substring(7);
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
        return decoded.userId;
    } catch {
        return null;
    }
}

export async function GET(request: Request) {
    try {
        const userId = getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get all batches for user with certificates
        const batches = await prisma.batch.findMany({
            where: { creatorId: userId },
            include: {
                certificates: true
            },
            orderBy: { createdAt: 'desc' },
            take: 30 // Last 30 batches
        });

        // Calculate total certificates (simplified since status field doesn't exist)
        const totalCertificates = batches.reduce((acc, batch) => acc + batch.certificates.length, 0);

        // Timeline data (group by date)
        const timelineMap = new Map<string, number>();
        batches.forEach(batch => {
            const date = batch.createdAt.toISOString().split('T')[0];
            const count = batch.certificates.length;
            timelineMap.set(date, (timelineMap.get(date) || 0) + count);
        });

        const timeline = {
            labels: Array.from(timelineMap.keys()).reverse().slice(0, 14), // Last 14 days
            data: Array.from(timelineMap.values()).reverse().slice(0, 14)
        };

        // Batch certificate counts (last 10 batches)
        const batchCertificateCounts = batches.slice(0, 10).map(batch => ({
            batchName: batch.name,
            count: batch.certificates.length,
            date: batch.createdAt.toISOString().split('T')[0]
        })).reverse(); // Reverse to show oldest to newest

        return NextResponse.json({
            overview: {
                totalCertificates,
                totalBatches: batches.length
            },
            timeline,
            batchCertificateCounts
        });
    } catch (error) {
        console.error('Error fetching charts data:', error);
        return NextResponse.json(
            { error: 'Failed to fetch charts data' },
            { status: 500 }
        );
    }
}
