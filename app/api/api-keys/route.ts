import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import crypto from 'crypto';

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

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user?.is_api_enabled) {
    return new NextResponse('API access not enabled', { status: 403 });
  }

  const apiKeys = await prisma.apiKey.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      name: true,
      createdAt: true,
      lastUsed: true,
      expiresAt: true,
    },
  });

  return NextResponse.json(apiKeys);
}

export async function POST(request: Request) {
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

  const { name } = await request.json();
  const key = `sk_${crypto.randomBytes(32).toString('hex')}`;

  const apiKey = await prisma.apiKey.create({
    data: {
      name,
      key,
      userId: user.id,
    },
  });

  return NextResponse.json({ id: apiKey.id, key });
}