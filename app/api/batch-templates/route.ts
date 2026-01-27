
import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
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

export async function GET(request: Request) {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const templates = await prisma.batchTemplate.findMany({
            where: { userId },
            include: {
                template: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(templates);
    } catch (error) {
        console.error('Error fetching batch templates:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const userId = getUserIdFromRequest(request);
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { name, description, templateId, cc, bcc, subject, message } = body;

        if (!name) {
            return NextResponse.json({ error: 'Template name is required' }, { status: 400 });
        }

        const newTemplate = await prisma.batchTemplate.create({
            data: {
                userId,
                name,
                description,
                templateId: templateId || null,
                cc,
                bcc,
                subject,
                message
            }
        });

        return NextResponse.json(newTemplate, { status: 201 });
    } catch (error) {
        console.error('Error creating batch template:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
