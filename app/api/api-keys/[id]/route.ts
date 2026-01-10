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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user?.is_api_enabled) {
    return new NextResponse('API access not enabled', { status: 403 });
  }
  const { id } = await params;
  await prisma.apiKey.deleteMany({
    where: {
      id: id,
      userId: user.id,
    },
  });

  return new NextResponse(null, { status: 204 });
}