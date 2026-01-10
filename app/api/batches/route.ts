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

export async function GET(request: Request) {
  const userId = getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const skip = (page - 1) * limit;

  const [batches, total] = await Promise.all([
    prisma.batch.findMany({
      where: { creatorId: userId },
      include: {
        _count: {
          select: { certificates: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.batch.count({
      where: { creatorId: userId }
    })
  ]);

  return NextResponse.json({
    batches,
    total,
    pages: Math.ceil(total / limit)
  });
}