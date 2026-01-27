import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import jwt from 'jsonwebtoken';
import { categorizeError } from '@/app/lib/batch-utils';

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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { batchId } = await params;

    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        certificates: {
          select: { id: true }
        },
        failedCertificates: {
          select: {
            id: true,
            error: true,
            data: true,
            createdAt: true
          }
        },
        invalidEmails: {
          select: {
            id: true
          }
        }
      },
    });

    if (!batch || batch.creatorId !== userId) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    const technicalFailures: any[] = [];
    const complianceFailures: any[] = [];

    batch.failedCertificates.forEach(failed => {
      const errorDetails = categorizeError(failed.error);
      const data = failed.data as any;
      const email = data.email || data.recipientEmail || 'Unknown';

      const entry = {
        id: failed.id,
        email: email,
        reason: errorDetails.displayName,
        errorDetails: failed.error,
        canResend: errorDetails.canResend,
        retryCount: 0, // Not tracked in this model yet
        date: failed.createdAt.toISOString()
      };

      if (errorDetails.canResend) {
        technicalFailures.push(entry);
      } else {
        complianceFailures.push(entry);
      }
    });

    return NextResponse.json({
      batch: {
        id: batch.id,
        name: batch.name,
        totalInCSV: batch.certificates.length + batch.failedCertificates.length + batch.invalidEmails.length,
        totalSent: batch.certificates.length,
        totalFailed: batch.failedCertificates.length + batch.invalidEmails.length,
        analysisStatus: 'Complete',
        createdAt: batch.createdAt,
      },
      failedEmails: {
        technical: technicalFailures,
        compliance: complianceFailures,
      },
      certificates: {
        total: batch.certificates.length + batch.failedCertificates.length,
        success: batch.certificates.length,
        failed: batch.failedCertificates.length,
        pending: 0,
      },
    });
  } catch (error) {
    console.error('Error fetching bounce results:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bounce results' },
      { status: 500 }
    );
  }
}
