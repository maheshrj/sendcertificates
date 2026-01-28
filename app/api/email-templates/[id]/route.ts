// API route for getting, updating, and deleting individual email templates
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;

function getUserIdFromRequest(request: Request): string | null {
    const token = request.headers
        .get("cookie")
        ?.split("; ")
        .find((c) => c.startsWith("token="))
        ?.split("=")[1];

    if (!token) return null;

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        return decoded.userId;
    } catch {
        return null;
    }
}

// GET: Retrieve a single email template
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const userId = getUserIdFromRequest(request);

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const template = await prisma.emailTemplate.findFirst({
            where: {
                id: params.id,
                userId,
            },
        });

        if (!template) {
            return NextResponse.json(
                { error: 'Template not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(template);
    } catch (error) {
        console.error('Error fetching email template:', error);
        return NextResponse.json(
            { error: 'Failed to fetch email template' },
            { status: 500 }
        );
    }
}

// PUT: Update an email template
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const userId = getUserIdFromRequest(request);

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify ownership
        const existingTemplate = await prisma.emailTemplate.findFirst({
            where: {
                id: params.id,
                userId,
            },
        });

        if (!existingTemplate) {
            return NextResponse.json(
                { error: 'Template not found' },
                { status: 404 }
            );
        }

        const body = await request.json();
        const { name, subject, body: emailBody } = body;

        // Validation
        if (!name || !subject || !emailBody) {
            return NextResponse.json(
                { error: 'Name, subject, and body are required' },
                { status: 400 }
            );
        }

        if (name.length > 100) {
            return NextResponse.json(
                { error: 'Template name must be 100 characters or less' },
                { status: 400 }
            );
        }

        if (subject.length > 200) {
            return NextResponse.json(
                { error: 'Subject must be 200 characters or less' },
                { status: 400 }
            );
        }

        if (emailBody.length > 5000) {
            return NextResponse.json(
                { error: 'Body must be 5000 characters or less' },
                { status: 400 }
            );
        }

        const updatedTemplate = await prisma.emailTemplate.update({
            where: { id: params.id },
            data: {
                name,
                subject,
                body: emailBody,
            },
        });

        return NextResponse.json(updatedTemplate);
    } catch (error) {
        console.error('Error updating email template:', error);
        return NextResponse.json(
            { error: 'Failed to update email template' },
            { status: 500 }
        );
    }
}

// DELETE: Remove an email template
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const userId = getUserIdFromRequest(request);

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify ownership
        const existingTemplate = await prisma.emailTemplate.findFirst({
            where: {
                id: params.id,
                userId,
            },
        });

        if (!existingTemplate) {
            return NextResponse.json(
                { error: 'Template not found' },
                { status: 404 }
            );
        }

        await prisma.emailTemplate.delete({
            where: { id: params.id },
        });

        return NextResponse.json({ message: 'Template deleted successfully' });
    } catch (error) {
        console.error('Error deleting email template:', error);
        return NextResponse.json(
            { error: 'Failed to delete email template' },
            { status: 500 }
        );
    }
}
