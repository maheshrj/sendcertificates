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
    return NextResponse.json({
      batch: {
        id: batch.id,
        name: batch.name,
        totalInCSV: batch.totalInCSV,
        totalSent: batch.totalSent,
        totalFailed: batch.totalFailed,
        analysisStatus: batch.analysisStatus,
        estimatedCompletionTime: batch.estimatedCompletionTime,
        createdAt: batch.createdAt,
      },
      failedEmails: {
        technical: technical.map(f => ({
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
        success: certStats['success'] || 0,
        failed: certStats['failed'] || 0,
        pending: certStats['pending'] || 0,
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
