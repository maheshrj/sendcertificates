import { NextResponse } from 'next/server';
import { SESClient, GetIdentityVerificationAttributesCommand } from '@aws-sdk/client-ses';
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

    const { domain } = await request.json();
    if (!domain) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 });
    }

    // Get the current verification status of the domain
    const command = new GetIdentityVerificationAttributesCommand({
      Identities: [domain],
    });
    const response = await ses.send(command);

    const verificationAttributes = response.VerificationAttributes;

    if (!verificationAttributes || !verificationAttributes[domain]) {
      return NextResponse.json(
        { error: 'No verification attributes found for the specified domain' },
        { status: 404 }
      );
    }

    const verificationStatus = verificationAttributes[domain].VerificationStatus;

    // If verification has succeeded, mark domain as verified
    if (verificationStatus === 'Success') {
      await prisma.emailConfig.updateMany({
        where: { userId, customDomain: domain },
        data: { isVerified: true },
      });

      return NextResponse.json({
        message: 'Domain verification successful. Domain is now marked as verified.',
      });
    }

    // If not verified yet, just return the current status
    return NextResponse.json({
      message: `Domain verification status: ${verificationStatus}. Please wait until AWS SES finishes verification.`,
    });

  } catch (error) {
    console.error('Error in verifying domain status:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal Server Error',
      },
      { status: 500 }
    );
  }
}
