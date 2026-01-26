import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '@/app/lib/mail';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Return success message even if user doesn't exist (security best practice)
      return NextResponse.json({
        message: 'If that email is in our database, you will receive a reset link'
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 86400000); // 24 hours

    await prisma.user.update({
      where: { email },
      data: { resetToken, resetTokenExpiry },
    });

    // Send password reset email with new template
    await sendPasswordResetEmail(email, user.name, resetToken);

    return NextResponse.json({
      message: 'If that email is in our database, you will receive a reset link'
    });
  } catch (error) {
    console.error('Error in forgot-password:', error);
    return NextResponse.json({
      error: 'Failed to process password reset'
    }, { status: 500 });
  }
}
