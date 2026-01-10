import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/app/lib/db';

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
  try {
    const userId = getUserIdFromRequest(request);
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');

    if (!batchId) {
      return NextResponse.json({ error: 'Batch ID is required' }, { status: 400 });
    }

    // Get all certificates in the batch to get their emails
    const certificates = await prisma.certificate.findMany({
      where: {
        batchId: batchId,
      },
      select: {
        data: true,
      },
    });

    // Extract emails from certificates
    const emails = certificates.map((cert: { data: unknown }) => {
      const data = cert.data as Record<string, string>;
      return data.email;
    }).filter(Boolean); // Remove any undefined/null emails

    if (emails.length === 0) {
      return NextResponse.json({ bouncedEmails: [] });
    }

    // Get bounced emails by only matching the email addresses
    const bounces = await prisma.bounce.findMany({
      where: {
        email: {
          in: emails,
        },
      },
      distinct: ['email'], // Only get unique email addresses
      select: {
        email: true,
      },
    });

    const bouncedEmails = bounces.map((bounce: { email: string }) => bounce.email);

    return NextResponse.json({ bouncedEmails });
  } catch (error) {
    console.error('Error fetching bounce data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bounce data' },
      { status: 500 }
    );
  }
} 