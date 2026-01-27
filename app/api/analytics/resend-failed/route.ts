
import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import jwt from 'jsonwebtoken';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

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

// Reuse Redis connection logic (simplified)
let connection: IORedis | null = null;
let certificateQueue: Queue | null = null;

if (process.env.REDIS_URL) {
    connection = new IORedis(process.env.REDIS_URL, {
        maxRetriesPerRequest: null,
    });

    certificateQueue = new Queue('certificateQueue', {
        connection,
        defaultJobOptions: {
            attempts: 3,
            backoff: { type: 'exponential', delay: 1000 },
            removeOnComplete: true,
            removeOnFail: 100,
        },
    });
}

export async function POST(request: Request) {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { originalBatchId, emails, templateId } = body;

        if (!originalBatchId || !emails || !emails.length || !templateId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Verify original batch
        const originalBatch = await prisma.batch.findUnique({
            where: { id: originalBatchId },
            include: {
                certificates: true,
                failedCertificates: true,
            }
        });

        if (!originalBatch || originalBatch.creatorId !== userId) {
            return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
        }

        // 2. Resolve records for requested emails
        // We look in both successful Certificates (maybe failed sending) and FailedCertificates (failed generation)
        // We strictly match by 'email' field in the JSON data
        const recordsToResend: Record<string, string>[] = [];
        const missingEmails: string[] = [];

        // Helper to extract email from record data (case-insensitive key search)
        const getEmail = (data: any) => {
            const key = Object.keys(data).find(k => k.toLowerCase() === 'email');
            return key ? data[key]?.trim()?.toLowerCase() : null;
        };

        // Build map of available data
        const dataMap = new Map<string, any>();

        // Add from certificates
        originalBatch.certificates.forEach(cert => {
            const email = getEmail(cert.data);
            if (email) dataMap.set(email, cert.data);
        });

        // Add from failed certificates (overwrites successful ones if duplicate - usually means retry)
        originalBatch.failedCertificates.forEach(fail => {
            const email = getEmail(fail.data);
            if (email) dataMap.set(email, fail.data);
        });

        // Collect data for requested emails
        emails.forEach((email: string) => {
            const normalizedEmail = email.trim().toLowerCase();
            const data = dataMap.get(normalizedEmail);
            if (data) {
                recordsToResend.push(data);
            } else {
                missingEmails.push(email);
            }
        });

        if (recordsToResend.length === 0) {
            return NextResponse.json({ error: 'No matching records found for provided emails' }, { status: 400 });
        }

        // 3. Create new Batch
        const newBatchName = `${originalBatch.name} - Resend ${new Date().toLocaleTimeString()}`;

        // Calculate tokens needed (1 token per email roughly, assuming simple)
        // Note: detailed token logic is skipped here for brevity, assuming deduct-on-success model from Phase 1

        const newBatch = await prisma.batch.create({
            data: {
                name: newBatchName,
                creatorId: userId,
                totalInCSV: recordsToResend.length,
                isResend: true,
                originalBatchId: originalBatchId,
            },
        });

        // 4. Queue Jobs
        if (!certificateQueue) {
            return NextResponse.json({ error: 'Queue system unavailable' }, { status: 503 });
        }

        // Get email config for "from" address
        const emailConfig = await prisma.emailConfig.findUnique({ where: { userId } });
        const emailFrom = emailConfig?.customEmail || process.env.EMAIL_FROM || 'info@sendcertificates.com';

        // Chunk records
        const CHUNK_SIZE = 50; // Larger chunk for internal queue
        const chunks = [];
        for (let i = 0; i < recordsToResend.length; i += CHUNK_SIZE) {
            chunks.push(recordsToResend.slice(i, i + CHUNK_SIZE));
        }

        const jobPromises = chunks.map((chunk, index) => {
            return certificateQueue?.add('generate-certificate', {
                records: chunk,
                templateId,
                batchId: newBatch.id,
                userId,
                emailFrom,
                ccEmails: [], // Do not CC/BCC on resends to avoid spam
                bccEmails: [],
                batchIndex: index,
                totalBatches: chunks.length,
            });
        });

        await Promise.all(jobPromises);

        return NextResponse.json({
            message: 'Resend initiated successfully',
            newBatchId: newBatch.id,
            newBatchName: newBatchName,
            emailsFound: recordsToResend.length,
            emailsMissing: missingEmails.length,
            missingList: missingEmails
        });

    } catch (error: any) {
        console.error('Resend API Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
