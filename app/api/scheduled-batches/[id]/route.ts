import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import jwt from 'jsonwebtoken';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

/**
 * DELETE /api/scheduled-batches/[id]
 * Cancel a scheduled batch
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // 1. Authentication
        const userId = getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;

        // 2. Find the scheduled batch
        const scheduledBatch = await prisma.scheduledBatch.findUnique({
            where: { id },
        });

        if (!scheduledBatch) {
            return NextResponse.json(
                { error: 'Scheduled batch not found' },
                { status: 404 }
            );
        }

        // 3. Verify ownership
        if (scheduledBatch.creatorId !== userId) {
            return NextResponse.json(
                { error: 'Unauthorized access to scheduled batch' },
                { status: 403 }
            );
        }

        // 4. Check if batch can be cancelled
        if (scheduledBatch.status === 'completed') {
            return NextResponse.json(
                { error: 'Cannot cancel a completed batch' },
                { status: 400 }
            );
        }

        if (scheduledBatch.status === 'processing') {
            return NextResponse.json(
                { error: 'Cannot cancel a batch that is currently processing' },
                { status: 400 }
            );
        }

        // 5. Update status to cancelled
        await prisma.scheduledBatch.update({
            where: { id },
            data: { status: 'cancelled' },
        });

        return NextResponse.json({
            success: true,
            message: 'Scheduled batch cancelled successfully',
        });
    } catch (error: any) {
        console.error('Error cancelling scheduled batch:', error);
        return NextResponse.json(
            { error: 'Failed to cancel scheduled batch', details: error.message },
            { status: 500 }
        );
    }
}
