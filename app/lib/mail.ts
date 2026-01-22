import nodemailer from 'nodemailer';
import { getVerificationEmailTemplate, getResetPasswordEmailTemplate } from './email-templates';

export async function sendVerificationEmail(email: string, userName: string, verificationToken: string) {
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        const verifyLink = `${process.env.NEXT_PUBLIC_BASE_URL}/verify-email?token=${verificationToken}`;
        const htmlContent = getVerificationEmailTemplate(userName, verifyLink);

        await transporter.sendMail({
            from: `"SendCertificates" <${process.env.EMAIL_FROM || 'info@sendcertificates.com'}>`,
            to: email,
            subject: 'Verify your email - SendCertificates',
            html: htmlContent,
        });

        console.log(`Verification email sent to ${email}`);
        return { success: true };
    } catch (error) {
        console.error('Error sending verification email:', error);
        return { success: false, error };
    }
}

export async function sendPasswordResetEmail(email: string, userName: string, resetToken: string) {
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        const resetLink = `${process.env.NEXT_PUBLIC_BASE_URL}/reset-password?token=${resetToken}`;
        const htmlContent = getResetPasswordEmailTemplate(userName, resetLink);

        await transporter.sendMail({
            from: `"SendCertificates" <${process.env.EMAIL_FROM || 'info@sendcertificates.com'}>`,
            to: email,
            subject: 'Reset your password - SendCertificates',
            html: htmlContent,
        });

        console.log(`Password reset email sent to ${email}`);
        return { success: true };
    } catch (error) {
        console.error('Error sending password reset email:', error);
        return { success: false, error };
    }
}
