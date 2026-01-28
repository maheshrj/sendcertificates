import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import { getResendableEmails } from '@/app/lib/batch-utils';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import jwt from 'jsonwebtoken';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const JWT_SECRET = process.env.JWT_SECRET!;

// Helper to get User ID (duplicated from generate-certificates to ensure consistency)
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

// Initialize Redis and Queue
let connection: IORedis | null = null;
let certificateQueue: Queue | null = null;

if (process.env.REDIS_URL) {
    try {
        connection = new IORedis(process.env.REDIS_URL, {
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
        });

        certificateQueue = new Queue('certificateQueue', {
            connection,
            defaultJobOptions: {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 1000,
                },
                removeOnComplete: true,
                removeOnFail: 100,
            },
        });
    } catch (error) {
        console.error('❌ Failed to initialize Redis for resend-batch:', error);
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ batchId: string }> }
) {
    try {
        // 1. Authentication
        const userId = getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { batchId } = await params;

        let targetIds: string[] | null = null;
        try {
            const body = await request.json();
            if (body && Array.isArray(body.failedCertificateIds)) {
                targetIds = body.failedCertificateIds;
            }
        } catch (e) {
            // Body parsing failed or empty, assume "resend all" if valid JSON wasn't expected but ignore error
        }

        // 2. Fetch Original Batch
        const originalBatch = await prisma.batch.findUnique({
            where: { id: batchId },
            include: {
                failedCertificates: true,
                certificates: {
                    take: 1,
                    select: { templateId: true }
                }
            }
        });

        if (!originalBatch) {
            return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
        }

        if (originalBatch.creatorId !== userId) {
            return NextResponse.json({ error: 'Unauthorized access to batch' }, { status: 403 });
        }

        // 3. Identify Template ID
        // Try getting from the first successful certificate
        let templateId = originalBatch.certificates[0]?.templateId;

        // If not found (e.g., all failed), we can't easily proceed without metadata support.
        // For now, if templateId is missing, we abort.
        if (!templateId) {
            // Edge case: Try to find ANY certificate from this batch (maybe order by something else? no, take 1 is efficient)
            // If strictly essential, we could query for `Certificate` using batchId without relation, but `originalBatch.certificates` does that.

            return NextResponse.json({
                error: 'Could not identify template from original batch. Resend not possible.'
            }, { status: 400 });
        }

        // 4. Filter Resendable Emails
        let candidates = originalBatch.failedCertificates;

        // If specific IDs requested, filter by them
        if (targetIds && targetIds.length > 0) {
            candidates = candidates.filter(c => targetIds!.includes(c.id));
        }

        const failedItems = candidates.map(f => ({
            error: f.error,
            data: f.data as any
        }));

        const resendableItems = getResendableEmails(failedItems);

        if (resendableItems.length === 0) {
            return NextResponse.json({
                error: 'No resendable failures found in selection.'
            }, { status: 400 });
        }

        // Extract records from resendable items
        const records = resendableItems.map(item => item.data);

        // 5. Get Email Config (for sender details)
        const emailConfig = await prisma.emailConfig.findUnique({
            where: { userId }
        });

        const emailFrom = emailConfig?.customEmail || process.env.DEFAULT_EMAIL_FROM || 'noreply@sendcertificates.com';

        // 6. Create New Batch
        const newBatchName = `${originalBatch.name} - Resend ${new Date().toLocaleTimeString()}`;

        const newBatch = await prisma.batch.create({
            data: {
                name: newBatchName,
                creatorId: userId,
                progress: 0,
                totalInCSV: records.length,
            }
        });

        // 7. Queue Job
        if (certificateQueue) {
            await certificateQueue.add('generate-certificate-resend', {
                records,
                templateId,
                batchId: newBatch.id,
                userId,
                emailFrom,
                ccEmails: [], // CC/BCC lost in resend context as discussed
                bccEmails: [],
                batchIndex: 0,
                totalBatches: 1
            });
        } else {
            // Fallback or Error if Redis not available
            // For now, if Redis is down, we probably shouldn't have reached here or createBatch logic handles it.
            // But to be safe:
            return NextResponse.json({ error: 'Queue system unavailable' }, { status: 503 });
        }

        return NextResponse.json({
            success: true,
            newBatchId: newBatch.id,
            resendCount: records.length,
            message: `Resending ${records.length} emails. New Batch: ${newBatchName}`
        });

    } catch (error: any) {
        console.error('Error in batch resend:', error);
        return NextResponse.json(
            { error: 'Failed to process resend request', details: error.message },
            { status: 500 }
        );
    }
}
