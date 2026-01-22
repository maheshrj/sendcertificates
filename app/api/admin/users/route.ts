import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

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

// GET /api/admin/users - Fetch all users
export async function GET(request: Request) {
    try {
        const userId = getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user is admin
        const admin = await prisma.user.findUnique({
            where: { id: userId },
            select: { is_admin: true },
        });

        if (!admin?.is_admin) {
            return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
        }

        // Fetch all users
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                organization: true,
                phone: true,
                tokens: true,
                is_admin: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return NextResponse.json({ users });
    } catch (error) {
        console.error('Error fetching users:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal Server Error' },
            { status: 500 }
        );
    }
}

// POST /api/admin/users - Create new user
export async function POST(request: Request) {
    try {
        const userId = getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user is admin
        const admin = await prisma.user.findUnique({
            where: { id: userId },
            select: { is_admin: true },
        });

        if (!admin?.is_admin) {
            return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
        }

        const { name, email, organization, phone } = await request.json();

        // Validate required fields
        if (!name || !email) {
            return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
        }

        // Generate random 16-character password
        const generatedPassword = crypto.randomBytes(8).toString('hex');

        // Hash password
        const hashedPassword = await bcrypt.hash(generatedPassword, 10);

        // Create user with default EmailConfig
        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                organization: organization || null,
                phone: phone || null,
                tokens: 100, // Default tokens
                is_admin: false,
                emailConfig: {
                    create: {
                        defaultSubject: 'Your Certificate',
                        defaultMessage: 'Please find your certificate attached.',
                        emailHeading: 'Congratulations on receiving your certificate!',
                        supportEmail: 'support@example.com',
                    },
                },
            },
            select: {
                id: true,
                name: true,
                email: true,
                organization: true,
                phone: true,
                tokens: true,
                is_admin: true,
                createdAt: true,
            },
        });

        return NextResponse.json({
            success: true,
            user: newUser,
            generatedPassword, // Return plaintext password for admin to share
        });
    } catch (error) {
        console.error('Error creating user:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal Server Error' },
            { status: 500 }
        );
    }
}

// DELETE /api/admin/users?id={userId} - Delete user with cascade
export async function DELETE(request: Request) {
    try {
        const userId = getUserIdFromRequest(request);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user is admin
        const admin = await prisma.user.findUnique({
            where: { id: userId },
            select: { is_admin: true },
        });

        if (!admin?.is_admin) {
            return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
        }

        // Get target user ID from query params
        const url = new URL(request.url);
        const targetUserId = url.searchParams.get('id');

        if (!targetUserId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        // Prevent self-deletion
        if (targetUserId === userId) {
            return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
        }

        // Cascade delete user and all related data in a transaction
        await prisma.$transaction(async (tx) => {
            // 1. Delete TokenTransactions
            await tx.tokenTransaction.deleteMany({
                where: { userId: targetUserId },
            });

            // 2. Delete Certificates
            await tx.certificate.deleteMany({
                where: { creatorId: targetUserId },
            });

            // 3. Get all batches created by user
            const userBatches = await tx.batch.findMany({
                where: { creatorId: targetUserId },
                select: { id: true },
            });

            const batchIds = userBatches.map((b) => b.id);

            if (batchIds.length > 0) {
                // Delete FailedCertificates in user's batches
                await tx.failedCertificate.deleteMany({
                    where: { batchId: { in: batchIds } },
                });

                // Delete InvalidEmails in user's batches
                await tx.invalidEmail.deleteMany({
                    where: { batchId: { in: batchIds } },
                });

                // Delete Certificates in user's batches (if any remaining)
                await tx.certificate.deleteMany({
                    where: { batchId: { in: batchIds } },
                });
            }

            // 4. Delete Batches
            await tx.batch.deleteMany({
                where: { creatorId: targetUserId },
            });

            // 5. Delete Templates
            await tx.template.deleteMany({
                where: { creatorId: targetUserId },
            });

            // 6. Delete ApiKeys
            await tx.apiKey.deleteMany({
                where: { userId: targetUserId },
            });

            // 7. Delete EmailConfig
            await tx.emailConfig.deleteMany({
                where: { userId: targetUserId },
            });

            // 8. Finally, delete the User
            await tx.user.delete({
                where: { id: targetUserId },
            });
        });

        return NextResponse.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal Server Error' },
            { status: 500 }
        );
    }
}
