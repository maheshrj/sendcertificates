// API route for listing and creating email templates
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

// GET: List all email templates for the current user
export async function GET(request: NextRequest) {
    try {
        const userId = getUserIdFromRequest(request);

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const templates = await prisma.emailTemplate.findMany({
            where: { userId },
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
        const userId = getUserIdFromRequest(request);

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
                userId,
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
