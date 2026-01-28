// API route for listing and creating email templates
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { getServerSession } from 'next-auth/next';

// GET: List all email templates for the current user
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession();

        if (!session || !session.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const templates = await prisma.emailTemplate.findMany({
            where: { userId: user.id },
            orderBy: { updatedAt: 'desc' },
        });

        return NextResponse.json(templates);
    } catch (error) {
        console.error('Error fetching email templates:', error);
        return NextResponse.json(
            { error: 'Failed to fetch email templates' },
            { status: 500 }
        );
    }
}

// POST: Create a new email template
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession();

        if (!session || !session.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
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

        const template = await prisma.emailTemplate.create({
            data: {
                userId: user.id,
                name,
                subject,
                body: emailBody,
            },
        });

        return NextResponse.json(template, { status: 201 });
    } catch (error) {
        console.error('Error creating email template:', error);
        return NextResponse.json(
            { error: 'Failed to create email template' },
            { status: 500 }
        );
    }
}
