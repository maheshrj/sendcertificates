/**
 * Scheduler Worker
 * 
 * This worker polls for scheduled batches that are due to run and executes them.
 * It runs every minute and processes batches whose scheduledAt time has passed.
 */

import prisma from '../lib/db';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { parse } from 'csv-parse/sync';

let connection: IORedis | null = null;
let certificateQueue: Queue | null = null;

// Initialize Redis and Queue
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

        console.log('✅ Scheduler worker initialized with Redis connection');
    } catch (error) {
        console.error('❌ Failed to initialize Redis for scheduler:', error);
    }
} else {
    console.warn('⚠️ REDIS_URL not configured - scheduler will be disabled');
}

/**
 * Download CSV from S3 URL
 */
async function downloadCSVFromS3(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to download CSV from S3: ${response.statusText}`);
    }
    return await response.text();
}

/**
 * Process a single scheduled batch
 */
async function processScheduledBatch(scheduledBatch: any) {
    console.log(`📅 Processing scheduled batch: ${scheduledBatch.name} (ID: ${scheduledBatch.id})`);

    try {
        // 1. Update status to processing
        await prisma.scheduledBatch.update({
            where: { id: scheduledBatch.id },
            data: { status: 'processing' },
        });

        // 2. Download CSV from S3
        const csvText = await downloadCSVFromS3(scheduledBatch.csvFileUrl);
        const records = parse(csvText, { columns: true });

        console.log(`📊 Parsed ${records.length} records from CSV`);

        // 3. Get email config for the user
        const emailConfig = await prisma.emailConfig.findUnique({
            where: { userId: scheduledBatch.creatorId },
        });

        const emailFrom = emailConfig?.customEmail || process.env.EMAIL_FROM || 'noreply@sendcertificates.com';

        // 4. Create a new Batch record
        const batch = await prisma.batch.create({
            data: {
                name: scheduledBatch.name,
                creatorId: scheduledBatch.creatorId,
                progress: 0,
                totalInCSV: records.length,
            },
        });

        console.log(`✅ Created batch: ${batch.id}`);

        // 5. Parse CC/BCC emails
        const ccEmails = scheduledBatch.cc
            ? scheduledBatch.cc.split(',').map((e: string) => e.trim()).filter(Boolean)
            : [];
        const bccEmails = scheduledBatch.bcc
            ? scheduledBatch.bcc.split(',').map((e: string) => e.trim()).filter(Boolean)
            : [];

        // 6. Split records into sub-batches and enqueue
        const BATCH_SIZE = 100;
        const batches = [];
        for (let i = 0; i < records.length; i += BATCH_SIZE) {
            batches.push(records.slice(i, i + BATCH_SIZE));
        }

        if (certificateQueue) {
            await Promise.all(
                batches.map((batchRecords, index) => {
                    return certificateQueue!.add('generateCertificates', {
                        records: batchRecords,
                        templateId: scheduledBatch.templateId,
                        batchId: batch.id,
                        userId: scheduledBatch.creatorId,
                        emailFrom,
                        ccEmails,
                        bccEmails,
                        batchIndex: index,
                        totalBatches: batches.length,
                    });
                })
            );

            console.log(`✅ Enqueued ${batches.length} sub-batches for processing`);
        } else {
            throw new Error('Certificate queue not available');
        }

        // 7. Update scheduled batch status to completed
        await prisma.scheduledBatch.update({
            where: { id: scheduledBatch.id },
            data: { status: 'completed' },
        });

        console.log(`✅ Scheduled batch ${scheduledBatch.id} completed successfully`);
    } catch (error: any) {
        console.error(`❌ Error processing scheduled batch ${scheduledBatch.id}:`, error);

        // Update status to failed with error message
        await prisma.scheduledBatch.update({
            where: { id: scheduledBatch.id },
            data: {
                status: 'failed',
                error: error.message,
            },
        });
    }
}

/**
 * Main scheduler loop
 * Runs every minute to check for due batches
 */
async function runScheduler() {
    try {
        const now = new Date();

        // Find all pending batches that are due
        const dueBatches = await prisma.scheduledBatch.findMany({
            where: {
                status: 'pending',
                scheduledAt: {
                    lte: now,
                },
            },
            orderBy: {
                scheduledAt: 'asc',
            },
        });

        if (dueBatches.length > 0) {
            console.log(`📅 Found ${dueBatches.length} scheduled batch(es) due for execution`);

            // Process each batch sequentially to avoid overwhelming the system
            for (const batch of dueBatches) {
                await processScheduledBatch(batch);
            }
        }
    } catch (error) {
        console.error('❌ Error in scheduler loop:', error);
    }
}

/**
 * Start the scheduler
 * Runs every minute
 */
export function startScheduler() {
    if (!connection || !certificateQueue) {
        console.warn('⚠️ Scheduler not started - Redis connection not available');
        return;
    }

    console.log('🚀 Starting batch scheduler (polling every 1 minute)');

    // Run immediately on start
    runScheduler();

    // Then run every minute
    setInterval(runScheduler, 60 * 1000);
}

// Auto-start if this file is run directly
if (require.main === module) {
    startScheduler();
}
