import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import jwt from 'jsonwebtoken';
import { SESClient, DeleteIdentityCommand } from '@aws-sdk/client-ses';

const ses = new SESClient({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

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

    const config = await prisma.emailConfig.findUnique({
      where: { userId },
      select: {
        customDomain: true,
        customEmail: true,
        isVerified: true,
        dkimRecords: true,
      },
    });

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error in GET /api/domain-config:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
    try {
      const userId = getUserIdFromRequest(request);
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
  
      const { customDomain, customEmail } = await request.json();
  
      const config = await prisma.emailConfig.upsert({
        where: { userId },
        create: {
          userId,
          customDomain,
          customEmail,
        },
        update: {
          customDomain,
          customEmail,
        },
      });
  
      return NextResponse.json(config);
    } catch (error) {
      console.error('Error in PUT /api/domain-config:', error);
      return NextResponse.json({ 
        error: error instanceof Error ? error.message : 'Internal Server Error' 
      }, { status: 500 });
    }
  }

  export async function DELETE(request: Request) {
    try {
      const userId = getUserIdFromRequest(request);
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
  
      // First, get the domain that needs to be deleted from SES
      const config = await prisma.emailConfig.findUnique({
        where: { userId },
        select: { customDomain: true },
      });
  
      if (config?.customDomain) {
        // Delete the domain identity from AWS SES
        const deleteCommand = new DeleteIdentityCommand({
          Identity: config.customDomain,
        });
        await ses.send(deleteCommand);
      }
  
      // Then delete from database
      await prisma.emailConfig.delete({
        where: { userId },
      });
  
      return NextResponse.json({ message: 'Configuration deleted successfully' });
    } catch (error) {
      console.error('Error in DELETE /api/domain-config:', error);
      return NextResponse.json({ 
        error: error instanceof Error ? error.message : 'Internal Server Error' 
      }, { status: 500 });
    }
  }