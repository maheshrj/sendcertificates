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
  const userId = getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const skip = (page - 1) * limit;

  try {
    // Await the params to get the batchId
    const { batchId } = await context.params;
    
    // First check if the batch exists and belongs to the user
    const batch = await prisma.batch.findUnique({
      where: {
        id: batchId,
      },
      select: {
        creatorId: true
      }
    });

    if (!batch || batch.creatorId !== userId) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    // Get certificates with pagination
    const [certificates, total] = await Promise.all([
      prisma.certificate.findMany({
        where: {
          batchId: batchId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.certificate.count({
        where: {
          batchId: batchId,
        },
      }),
    ]);

    return NextResponse.json({
      certificates,
      total,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error fetching certificates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch certificates' },
      { status: 500 }
    );
  }
}