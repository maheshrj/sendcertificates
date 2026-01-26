import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';

export async function POST(request: Request) {
    try {
        const { token } = await request.json();

        if (!token) {
            return NextResponse.json({ error: 'Verification token is required' }, { status: 400 });
        }

        // Find user with matching verification token
        const user = await prisma.user.findFirst({
            where: {
                verificationToken: token,
                verificationTokenExpiry: { gte: new Date() },
            },
        });

        if (!user) {
            return NextResponse.json({
                error: 'Invalid or expired verification token'
            }, { status: 400 });
        }

        // Update user to mark email as verified
        await prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerified: true,
                verificationToken: null,
                verificationTokenExpiry: null,
            },
        });

        return NextResponse.json({
            message: 'Email verified successfully! You can now login.'
        });
    } catch (error) {
        console.error('Error verifying email:', error);
        return NextResponse.json({
            error: 'Failed to verify email'
        }, { status: 500 });
    }
}
