import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';

/**
 * Unsubscribe endpoint
 * Handles both GET (link-based) and POST (one-click) unsubscribe requests
 */

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const email = searchParams.get('email');

        if (!email) {
            return new NextResponse(
                `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Unsubscribe</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
            .error { color: #d32f2f; }
          </style>
        </head>
        <body>
          <h1 class="error">Error</h1>
          <p>No email address provided.</p>
        </body>
        </html>
        `,
                { status: 400, headers: { 'Content-Type': 'text/html' } }
            );
        }

        // Add to suppression list
        await prisma.suppressionList.upsert({
            where: { email: email.toLowerCase() },
            update: {
                reason: 'unsubscribe',
                type: 'unsubscribe',
                source: 'User requested via link',
            },
            create: {
                email: email.toLowerCase(),
                reason: 'unsubscribe',
                type: 'unsubscribe',
                source: 'User requested via link',
            },
        });

        console.log(`Email ${email} unsubscribed successfully`);

        return new NextResponse(
            `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Unsubscribed Successfully</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
          .success { color: #2e7d32; }
          .email { background: #f5f5f5; padding: 10px; border-radius: 4px; display: inline-block; margin: 10px 0; }
        </style>
      </head>
      <body>
        <h1 class="success">✓ Unsubscribed Successfully</h1>
        <p>The email address</p>
        <div class="email">${email}</div>
        <p>has been removed from our certificate mailing list.</p>
        <p>You will no longer receive certificate emails from us.</p>
        <p style="margin-top: 30px; font-size: 14px; color: #666;">
          If you unsubscribed by mistake, please contact our support team.
        </p>
      </body>
      </html>
      `,
            { status: 200, headers: { 'Content-Type': 'text/html' } }
        );
    } catch (error) {
        console.error('Error processing unsubscribe:', error);
        return new NextResponse(
            `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Error</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
          .error { color: #d32f2f; }
        </style>
      </head>
      <body>
        <h1 class="error">Error</h1>
        <p>An error occurred while processing your unsubscribe request.</p>
        <p>Please try again later or contact support.</p>
      </body>
      </html>
      `,
            { status: 500, headers: { 'Content-Type': 'text/html' } }
        );
    }
}

/**
 * POST handler for one-click unsubscribe (RFC 8058)
 */
export async function POST(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const email = searchParams.get('email');

        if (!email) {
            return NextResponse.json({ error: 'No email provided' }, { status: 400 });
        }

        // Add to suppression list
        await prisma.suppressionList.upsert({
            where: { email: email.toLowerCase() },
            update: {
                reason: 'unsubscribe',
                type: 'unsubscribe',
                source: 'One-click unsubscribe',
            },
            create: {
                email: email.toLowerCase(),
                reason: 'unsubscribe',
                type: 'unsubscribe',
                source: 'One-click unsubscribe',
            },
        });

        console.log(`Email ${email} unsubscribed via one-click`);

        return NextResponse.json({ message: 'Unsubscribed successfully' });
    } catch (error) {
        console.error('Error processing one-click unsubscribe:', error);
        return NextResponse.json(
            { error: 'Failed to process unsubscribe' },
            { status: 500 }
        );
    }
}
