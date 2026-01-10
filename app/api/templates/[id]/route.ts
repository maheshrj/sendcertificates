// app/api/templates/[id]/route.ts

import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;

function getUserIdFromRequest(request: Request): string | null {
  try {
    const token = request.headers
      .get('cookie')
      ?.split('; ')
      .find((c) => c.startsWith('token='))
      ?.split('=')[1];

    if (!token) {
      return null;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return decoded.userId;
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch the template and verify it belongs to the user
    const template = await prisma.template.findFirst({
      where: {
        id,
        creatorId: userId,
      },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        placeholders: true,
        signatures: true,
        qrPlaceholders: true, 
        width: true,
        height: true,
        creatorId: true,
      },
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found or unauthorized' },
        { status: 404 }
      );
    }

    return NextResponse.json(template, { status: 200 });
  } catch (error) {
    console.error('Error fetching template:', error);
    return NextResponse.json(
      { error: 'Failed to fetch template' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // Await params before using it
    const userId = getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify that the template belongs to the user
    const template = await prisma.template.findFirst({
      where: {
        id,
        creatorId: userId,
      },
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found or unauthorized' },
        { status: 404 }
      );
    }

    // Unlink the certificates from the template
    await prisma.certificate.updateMany({
      where: {
        templateId: id,
      },
      data: {
        templateId: undefined,
      },
    });

    // Delete the template
    await prisma.template.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: templateId } = await params;
    const userId = getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    if (!body.name || !body.imageUrl) {
      return NextResponse.json(
        { error: "Missing required fields: 'name' and 'imageUrl'" },
        { status: 400 }
      );
    }

    const template = await prisma.template.update({
      where: { id: templateId, creatorId: userId },
      data: {
        name: body.name,
        imageUrl: body.imageUrl,
        placeholders: body.placeholders || [],
        signatures: body.signatures || [],
        qrPlaceholders: body.qrPlaceholders || [], // Add this line
      },
    });

    return NextResponse.json(template, { status: 200 });
  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    );
  }
}
