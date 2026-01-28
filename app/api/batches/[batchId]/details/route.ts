import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import { categorizeError } from '@/app/lib/batch-utils';

export const dynamic = 'force-dynamic';

/**
 * GET /api/batches/[batchId]/details
 * 
 * Returns detailed information about a batch including:
 * - Batch metadata (name, progress, template, etc.)
 * - Completed certificates
 * - Failed certificates with error categorization
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ batchId: string }> }
) {
    try {
        const { batchId } = await params;

        // Fetch batch with all related data
        const batch = await prisma.batch.findUnique({
            where: { id: batchId },
            include: {
                certificates: {
                    select: {
                        id: true,
                        data: true,
                        createdAt: true,
                        templateId: true,
                        generatedImageUrl: true,
                        uniqueIdentifier: true,
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                },
                failedCertificates: {
                    select: {
                        id: true,
                        data: true,
                        error: true,
                        createdAt: true,
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                },
                invalidEmails: {
                    select: {
                        id: true,
                        email: true,
                        reason: true,
                        createdAt: true,
                    }
                }
            }
        });

        if (!batch) {
            return NextResponse.json(
                { error: 'Batch not found' },
                { status: 404 }
            );
        }

        // Process completed certificates
        const completed = batch.certificates.map(cert => {
            const data = cert.data as any;
            // Try multiple field name variations to extract name and email
            const name = data.Name || data.name || data.recipientName || data.RecipientName || 'N/A';
            const email = data.Email || data.email || data.recipientEmail || data.RecipientEmail || 'N/A';

            return {
                id: cert.id,
                name,
                email,
                sentAt: cert.createdAt,
                downloadUrl: cert.generatedImageUrl,
                certificateId: cert.uniqueIdentifier,
            };
        });

        // Process failed certificates with error categorization
        const failed = batch.failedCertificates.map(failed => {
            const data = failed.data as any;
            const errorCategory = categorizeError(failed.error);

            // Try multiple field name variations
            const name = data.Name || data.name || data.recipientName || data.RecipientName || 'N/A';
            const email = data.Email || data.email || data.recipientEmail || data.RecipientEmail || 'N/A';

            return {
                id: failed.id,
                name,
                email,
                error: failed.error,
                errorType: errorCategory.type,
                errorDisplayName: errorCategory.displayName,
                errorDescription: errorCategory.description,
                canResend: errorCategory.canResend,
                failedAt: failed.createdAt,
            };
        });

        // Process invalid emails
        const invalid = batch.invalidEmails.map(inv => ({
            id: inv.id,
            email: inv.email,
            reason: inv.reason,
            createdAt: inv.createdAt,
        }));

        // Calculate statistics
        const total = completed.length + failed.length;
        const resendableCount = failed.filter(f => f.canResend).length;
        const excludedCount = failed.filter(f => !f.canResend).length;

        // Return comprehensive batch details
        return NextResponse.json({
            batch: {
                id: batch.id,
                name: batch.name,
                progress: batch.progress,
                createdAt: batch.createdAt,
                templateId: batch.certificates[0]?.templateId || null,
            },
            stats: {
                total,
                completed: completed.length,
                failed: failed.length,
                invalid: invalid.length,
                resendable: resendableCount,
                excluded: excludedCount,
            },
            completed,
            failed,
            invalid,
        });

    } catch (error: any) {
        console.error('Error fetching batch details:', error);
        return NextResponse.json(
            { error: 'Failed to fetch batch details', details: error.message },
            { status: 500 }
        );
    }
}
