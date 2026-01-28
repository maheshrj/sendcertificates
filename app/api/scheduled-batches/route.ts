import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import { uploadToS3 } from '@/app/lib/s3';
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

interface FileLike {
    arrayBuffer: () => Promise<ArrayBuffer>;
    text: () => Promise<string>;
    name?: string;
    size?: number;
    type?: string;
}

function isFileLike(value: any): value is FileLike {
    return (
        value &&
        typeof value.arrayBuffer === 'function' &&
        typeof value.text === 'function' &&
        (typeof value.name === 'string' || typeof value.name === 'undefined')
    );
}

/**
 * POST /api/scheduled-batches
 * Create a new scheduled batch
 */
export async function POST(request: NextRequest) {
    try {
        // 1. Authentication
        const userId = getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Parse form data
        const formData = await request.formData();
        const batchName = formData.get('batchName') as string;
        const csvFile = formData.get('csv');
        const templateId = formData.get('templateId') as string;
        const scheduledAt = formData.get('scheduledAt') as string;
        const ccEmails = formData.get('ccEmails') as string;
        const bccEmails = formData.get('bccEmails') as string;
        const subject = formData.get('subject') as string;
        const message = formData.get('message') as string;

        // 3. Validation
        if (!csvFile || !isFileLike(csvFile)) {
            return NextResponse.json({ error: 'No CSV file provided' }, { status: 400 });
        }
        if (!batchName) {
            return NextResponse.json({ error: 'Batch name is required' }, { status: 400 });
        }
        if (!templateId) {
            return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
        }
        if (!scheduledAt) {
            return NextResponse.json({ error: 'Scheduled time is required' }, { status: 400 });
        }

        // Validate scheduled time is in the future
        const scheduledDate = new Date(scheduledAt);
        if (scheduledDate <= new Date()) {
            return NextResponse.json(
                { error: 'Scheduled time must be in the future' },
                { status: 400 }
            );
        }

        // 4. Verify template ownership
        const template = await prisma.template.findUnique({ where: { id: templateId } });
        if (!template || template.creatorId !== userId) {
            return NextResponse.json(
                { error: 'Unauthorized access to template' },
                { status: 403 }
            );
        }

        // 5. Upload CSV to S3
        const csvBuffer = Buffer.from(await csvFile.arrayBuffer());
        const csvKey = `scheduled-batches/${userId}/${Date.now()}-${csvFile.name || 'batch.csv'}`;
        const csvUrl = await uploadToS3(csvBuffer, csvKey);

        // 6. Create ScheduledBatch record
        const scheduledBatch = await prisma.scheduledBatch.create({
            data: {
                name: batchName,
                templateId,
                csvFileUrl: csvUrl,
                cc: ccEmails || null,
                bcc: bccEmails || null,
                subject: subject || null,
                message: message || null,
                scheduledAt: scheduledDate,
                creatorId: userId,
                status: 'pending',
            },
        });

        return NextResponse.json({
            success: true,
            scheduledBatch: {
                id: scheduledBatch.id,
                name: scheduledBatch.name,
                scheduledAt: scheduledBatch.scheduledAt,
            },
            message: `Batch scheduled for ${scheduledDate.toLocaleString()}`,
        });
    } catch (error: any) {
        console.error('Error creating scheduled batch:', error);
        return NextResponse.json(
            { error: 'Failed to schedule batch', details: error.message },
            { status: 500 }
        );
    }
}

/**
 * GET /api/scheduled-batches
 * List all scheduled batches for the current user
 */
export async function GET(request: NextRequest) {
    try {
        // 1. Authentication
        const userId = getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Fetch scheduled batches
        const scheduledBatches = await prisma.scheduledBatch.findMany({
            where: {
                creatorId: userId,
                status: {
                    in: ['pending', 'processing'],
                },
            },
            include: {
                template: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: {
                scheduledAt: 'asc',
            },
        });

        return NextResponse.json({
            scheduledBatches: scheduledBatches.map((batch) => ({
                id: batch.id,
                name: batch.name,
                templateName: batch.template.name,
                scheduledAt: batch.scheduledAt,
                status: batch.status,
                createdAt: batch.createdAt,
            })),
        });
    } catch (error: any) {
        console.error('Error fetching scheduled batches:', error);
        return NextResponse.json(
            { error: 'Failed to fetch scheduled batches', details: error.message },
            { status: 500 }
        );
    }
}
