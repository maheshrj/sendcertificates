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
  context: { params: Promise<{ batchId: string }> }
) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { batchId } = await context.params;

    const batch = await prisma.batch.findUnique({
      where: {
        id: batchId,
        creatorId: userId,
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        progress: true,
        _count: {
          select: {
            certificates: true,
            failedCertificates: true,
            invalidEmails: true,
          }
        }
      }
    });

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    return NextResponse.json(batch);
  } catch (error) {
    console.error('Error fetching batch details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch batch details' },
      { status: 500 }
    );
  }
} 