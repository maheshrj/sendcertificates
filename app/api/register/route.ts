import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { sendVerificationEmail } from '@/app/lib/mail';

export async function POST(request: Request) {
  try {
    const { name, email, organization, phone, password } = await request.json();
    const adminEmail = process.env.ADMIN_EMAIL;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpiry = new Date(Date.now() + 86400000); // 24 hours

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        organization,
        phone,
        password: hashedPassword,
        is_admin: email === adminEmail,
        emailVerified: false,
        verificationToken,
        verificationTokenExpiry,
      },
    });

    await prisma.emailConfig.create({
      data: {
        userId: newUser.id,
        defaultSubject: "Your Certificate",
        defaultMessage: "Please find your certificate attached.",
        emailHeading: "Congratulations on receiving your certificate!",
        logoUrl: "https://bugsbucketrz.s3.ap-south-1.amazonaws.com/acme.png",
        supportEmail: "support@example.com",
      },
    });

    // Send verification email
    await sendVerificationEmail(email, name, verificationToken);

    return NextResponse.json({
      message: 'User registered successfully. Please check your email to verify your account.'
    });
  } catch (error) {
    console.error('Error registering user:', error);
    return NextResponse.json({ error: 'Failed to register user' }, { status: 500 });
  }
}
