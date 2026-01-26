// app/api/me/route.ts

import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function GET() {
  const token = (await cookies()).get('token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (user) {
      return NextResponse.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          is_admin: user.is_admin,
          is_api_enabled: user.is_api_enabled
        }
      });
    } else {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}
