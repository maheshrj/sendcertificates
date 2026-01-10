import prisma from '@/app/lib/db';
import { NextResponse } from 'next/server';

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

// Fetch email config
export async function GET(request: Request) {
    try {
      const userId = getUserIdFromRequest(request);
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
  
      let emailConfig = await prisma.emailConfig.findUnique({ where: { userId } });
  
      // If no config exists, create a default one
      if (!emailConfig) {
        emailConfig = await prisma.emailConfig.create({
          data: {
            userId,
            defaultSubject: "Your Certificate",
            defaultMessage: "Please find your certificate attached.",
          },
        });
        console.log(`Created default email config for userId: ${userId}`);
      }
  
      return NextResponse.json(emailConfig);
    } catch (error) {
      console.error('Error in GET /api/email-config:', error);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
  }

// Update email config
export async function PUT(request: Request) {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  
    const { defaultSubject, defaultMessage, logoUrl, emailHeading, supportEmail } = await request.json();
  
    const updatedEmailConfig = await prisma.emailConfig.update({
      where: { userId },
      data: { 
        defaultSubject, 
        defaultMessage,
        logoUrl,
        emailHeading,
        supportEmail
      },
    });
  
    return NextResponse.json(updatedEmailConfig);
  }
