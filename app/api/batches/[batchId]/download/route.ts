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

export async function GET(
  request: Request,
  params : { params: Promise<{ batchId: string }> }
) {
  try {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { batchId } = await params.params;

    // First check if the batch exists and belongs to the user
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        certificates: {
          select: {
            uniqueIdentifier: true,
            data: true,
            generatedImageUrl: true,
            createdAt: true,
          }
        }
      }
    });

    if (!batch || batch.creatorId !== userId) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    // Create CSV header
    let csvContent = 'Unique Identifier,Generated Image URL,Created At';

    // Add data fields if they exist
    const dataKeys = new Set<string>();
    batch.certificates.forEach((cert: { data: unknown }) => {
      Object.keys(cert.data as object).forEach(key => {
        dataKeys.add(key);
      });
    });

    if (dataKeys.size > 0) {
      csvContent += ',' + Array.from(dataKeys).join(',');
    }
    csvContent += '\n';

    // Add certificate data
    batch.certificates.forEach((cert: { uniqueIdentifier: string; generatedImageUrl: string; createdAt: Date; data: unknown }) => {
      const row = [
        cert.uniqueIdentifier,
        cert.generatedImageUrl,
        cert.createdAt ? new Date(cert.createdAt).toISOString() : '',
      ];

      // Add data values
      if (dataKeys.size > 0) {
        const certData = cert.data as Record<string, string>;
        dataKeys.forEach(key => {
          row.push(certData[key] || '');
        });
      }

      // Escape fields containing commas and add quotes where necessary
      const escapedRow = row.map(field => {
        if (typeof field === 'string' && (field.includes(',') || field.includes('"') || field.includes('\n'))) {
          return `"${field.replace(/"/g, '""')}"`;
        }
        return field;
      });

      csvContent += escapedRow.join(',') + '\n';
    });

    // Return CSV file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${batch.name}-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error generating CSV:', error);
    return NextResponse.json(
      { error: 'Failed to generate CSV' },
      { status: 500 }
    );
  }
}