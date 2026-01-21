import { NextResponse } from 'next/server';
import { SESClient, VerifyDomainDkimCommand } from '@aws-sdk/client-ses';
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

const ses = new SESClient({
  region: process.env.AWS_SES_REGION || process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_SES_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: Request) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { domain, email } = await request.json();

    const command = new VerifyDomainDkimCommand({ Domain: domain });
    const response = await ses.send(command);

    if (response.DkimTokens) {
      await prisma.emailConfig.upsert({
        where: { userId },
        create: {
          userId,
          customDomain: domain,
          customEmail: email,
          dkimRecords: response.DkimTokens,
          isVerified: false,
        },
        update: {
          customDomain: domain,
          customEmail: email,
          dkimRecords: response.DkimTokens,
          isVerified: false,
        },
      });
    }

    return NextResponse.json({
      message: 'Domain verification initiated',
      dkimTokens: response.DkimTokens
    });
  } catch (error) {
    console.error('Error in POST /api/verify-domain:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal Server Error'
    }, { status: 500 });
  }
}