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

    // Simplified version - full functionality requires Phase 2/3 schema updates
    // (FailedEmail model, status field, totalInCSV, totalSent, totalFailed fields)
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        certificates: true,
      },
    });

    if (!batch || batch.creatorId !== userId) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    // Return basic info until schema is updated
    return NextResponse.json({
      batch: {
        id: batch.id,
        name: batch.name,
        createdAt: batch.createdAt,
      },
      failedEmails: {
        technical: [],
        compliance: [],
      },
      certificates: {
        total: batch.certificates.length,
        success: 0,
        failed: 0,
        pending: 0,
      },
      message: 'Bounce analysis requires Phase 2/3 schema updates (FailedEmail model, status field, etc.)'
    });
  } catch (error) {
    console.error('Error fetching bounce results:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bounce results' },
      { status: 500 }
    );
  }
}
