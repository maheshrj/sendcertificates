import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/db';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ certificateId: string }> }
  ) {
    try {
      const { certificateId } = await params;
  
      const certificate = await prisma.certificate.findFirst({
        where: {
          uniqueIdentifier: certificateId,
        },
        include: {
            template: true,
            creator: {
              select: {
                name: true,
                organization: true,
                email: true
              }
            }
          },
      });
  
      if (!certificate) {
        return NextResponse.json(
          { error: 'Certificate not found' },
          { status: 404 }
        );
      }
  
      return NextResponse.json(certificate);
    } catch (error) {
      console.error('Error validating certificate:', error);
      return NextResponse.json(
        { error: 'Failed to validate certificate' },
        { status: 500 }
      );
    }
  }