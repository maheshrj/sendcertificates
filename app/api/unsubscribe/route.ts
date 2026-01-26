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
        getErrorPage('No email address provided.'),
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Get organization info from recent certificate sent to this email
    let logoUrl = null;
    let supportEmail = 'support@sendcertificates.com';
    let organizationName = 'SendCertificates';

    try {
      // Try to find from recent certificate
      const recentCert = await prisma.certificate.findFirst({
        where: {
          data: {
            path: ['email'],
            equals: email.toLowerCase()
          }
        },
        orderBy: { createdAt: 'desc' },
        include: {
          creator: {
            include: {
              emailConfig: true
            }
          }
        }
      });

      if (recentCert?.creator?.emailConfig) {
        logoUrl = recentCert.creator.emailConfig.logoUrl;
        supportEmail = recentCert.creator.emailConfig.supportEmail || supportEmail;
        organizationName = recentCert.creator.emailConfig.customDomain || organizationName;
      } else {
        // Fallback: Try to find from batch (if certificate lookup failed)
        const recentBatch = await prisma.batch.findFirst({
          orderBy: { createdAt: 'desc' },
          include: {
            creator: {
              include: {
                emailConfig: true
              }
            }
          }
        });

        if (recentBatch?.creator?.emailConfig) {
          logoUrl = recentBatch.creator.emailConfig.logoUrl;
          supportEmail = recentBatch.creator.emailConfig.supportEmail || supportEmail;
          organizationName = recentBatch.creator.emailConfig.customDomain || organizationName;
        }
      }
    } catch (err) {
      console.log('Could not fetch organization info:', err);
      // Continue with defaults
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
      getSuccessPage(email, logoUrl, supportEmail, organizationName),
      { status: 200, headers: { 'Content-Type': 'text/html' } }
    );
  } catch (error) {
    console.error('Error processing unsubscribe:', error);
    return new NextResponse(
      getErrorPage('An error occurred while processing your unsubscribe request. Please try again later or contact support.'),
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

function getSuccessPage(email: string, logoUrl: string | null, supportEmail: string, organizationName: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unsubscribed Successfully</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.15);
      max-width: 500px;
      width: 100%;
      padding: 50px 40px;
      text-align: center;
    }
    .logo {
      margin-bottom: 30px;
    }
    .logo img {
      height: 80px;
      max-width: 250px;
      object-fit: contain;
    }
    .icon {
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 25px;
      font-size: 48px;
      color: white;
      box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3);
    }
    h1 {
      color: #1f2937;
      font-size: 32px;
      margin-bottom: 20px;
      font-weight: 600;
      line-height: 1.2;
    }
    .email-box {
      background: #f3f4f6;
      padding: 16px 20px;
      border-radius: 10px;
      margin: 25px 0;
      font-family: 'Courier New', monospace;
      color: #374151;
      word-break: break-all;
      font-size: 15px;
      border: 2px solid #e5e7eb;
    }
    p {
      color: #6b7280;
      line-height: 1.7;
      margin-bottom: 12px;
      font-size: 16px;
    }
    .message {
      color: #4b5563;
      font-size: 15px;
      margin: 20px 0;
    }
    .support {
      margin-top: 40px;
      padding-top: 30px;
      border-top: 2px solid #e5e7eb;
    }
    .support p {
      font-size: 14px;
      color: #6b7280;
    }
    a {
      color: #667eea;
      text-decoration: none;
      font-weight: 500;
    }
    a:hover {
      text-decoration: underline;
      color: #5568d3;
    }
    @media (max-width: 600px) {
      .container {
        padding: 40px 25px;
      }
      h1 {
        font-size: 26px;
      }
      .logo img {
        height: 60px;
      }
      .icon {
        width: 70px;
        height: 70px;
        font-size: 40px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    ${logoUrl ? `
    <div class="logo">
      <img src="${logoUrl}" alt="${organizationName}" />
    </div>
    ` : `
    <div class="icon">&#10003;</div>
    `}
    
    <h1>Unsubscribed Successfully</h1>
    
    <p class="message">The email address</p>
    <div class="email-box">${email}</div>
    <p class="message">has been removed from our certificate mailing list.</p>
    <p>You will no longer receive certificate emails from us.</p>
    
    <div class="support">
      <p>Unsubscribed by mistake?<br>
        Contact us at <a href="mailto:${supportEmail}">${supportEmail}</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

function getErrorPage(message: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Error</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #f87171 0%, #dc2626 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.15);
      max-width: 500px;
      width: 100%;
      padding: 50px 40px;
      text-align: center;
    }
    .icon {
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 25px;
      font-size: 48px;
      color: white;
      box-shadow: 0 10px 25px rgba(239, 68, 68, 0.3);
    }
    h1 {
      color: #1f2937;
      font-size: 32px;
      margin-bottom: 20px;
      font-weight: 600;
    }
    p {
      color: #6b7280;
      line-height: 1.7;
      font-size: 16px;
    }
    @media (max-width: 600px) {
      .container {
        padding: 40px 25px;
      }
      h1 {
        font-size: 26px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">&#10005;</div>
    <h1>Error</h1>
    <p>${message}</p>
  </div>
</body>
</html>
  `;
}
