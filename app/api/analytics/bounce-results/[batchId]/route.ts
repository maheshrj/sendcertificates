
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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ batchId: string }> }
) {
  const userId = getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { batchId } = await params;

  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    include: {
      failedEmails: true,
      certificates: {
        select: { status: true },
      },
    },
  });

  if (!batch || batch.creatorId !== userId) {
    return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
  }

  // Categorize failed emails
  const technical = batch.failedEmails.filter(f => f.category === 'technical');
  const compliance = batch.failedEmails.filter(f => f.category === 'compliance');

  // Count certificate statuses
  const certStats = batch.certificates.reduce((acc, cert) => {
    acc[cert.status] = (acc[cert.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Calculate accurate counts from actual certificate statuses
  const actualTotalSent = certStats['success'] || 0;
  const actualTotalFailed = certStats['failed'] || 0;
  const actualTotalPending = certStats['pending'] || 0;

  return NextResponse.json({
    batch: {
      id: batch.id,
      name: batch.name,
      totalInCSV: batch.totalInCSV,
      totalSent: actualTotalSent, // Use calculated value instead of batch.totalSent
      totalFailed: actualTotalFailed, // Use calculated value instead of batch.totalFailed
      analysisStatus: batch.analysisStatus,
      estimatedCompletionTime: batch.estimatedCompletionTime,
      createdAt: batch.createdAt,
    },
    failedEmails: {
      technical: technical.map(f => ({
        id: f.id, // Add id for resend functionality
        email: f.email,
        reason: f.reason,
        retryCount: f.retryCount,
        errorDetails: f.errorDetails,
        canResend: f.canResend,
      })),
      compliance: compliance.map(f => ({
        email: f.email,
        reason: f.reason,
        date: f.createdAt.toISOString(),
      })),
    },
    certificates: {
      total: batch.certificates.length,
      success: actualTotalSent,
      failed: actualTotalFailed,
      pending: actualTotalPending,
    },
  });
}
