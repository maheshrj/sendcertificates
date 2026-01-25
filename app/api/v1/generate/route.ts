export const runtime = 'nodejs';
import QRCode from 'qrcode';
import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import { uploadToS3 } from '@/app/lib/s3';
import { createCanvas, loadImage, registerFont } from 'canvas';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import path from 'path';
import { rateLimiter } from '@/app/config/rate-limit';

registerFont(path.join(process.cwd(), 'public/fonts/MonteCarlo-Regular.ttf'), { family: 'MonteCarlo' });
registerFont(path.join(process.cwd(), 'public/fonts/AlexBrush-Regular.ttf'), { family: 'AlexBrush' });
registerFont(path.join(process.cwd(), 'public/fonts/Birthstone-Regular.ttf'), { family: 'Birthstone' });
registerFont(path.join(process.cwd(), 'public/fonts/DancingScript-Regular.ttf'), { family: 'DancingScript' });
registerFont(path.join(process.cwd(), 'public/fonts/LibreBaskerville-Regular.ttf'), { family: 'LibreBaskerville' });

let connection: IORedis | null = null;
let emailQueue: Queue | null = null;

// Only initialize Redis if REDIS_URL is available
if (process.env.REDIS_URL) {
  try {
    // Create Redis connection with error handling
    connection = new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    connection.on('error', (error) => {
      console.error('Redis connection error:', error);
    });

    connection.on('connect', () => {
      console.log('Successfully connected to Redis');
    });

    emailQueue = new Queue('emailQueue', {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    });
  } catch (error) {
    console.error('Failed to initialize Redis for v1/generate:', error);
    connection = null;
    emailQueue = null;
  }
} else {
  console.warn('REDIS_URL not configured - email queue will be disabled for v1/generate');
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

async function generateQRCode(data: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    QRCode.toBuffer(data, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 200,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    }, (err, buffer) => {
      if (err) reject(err);
      else resolve(buffer);
    });
  });
}

function replaceVariables(template: string | null, data: Record<string, any>): string {
  if (!template) return '';
  return template.replace(/\${(\w+)}/g, (_, key) => data[key] || '');
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const apiKey = request.headers.get('x-api-key');
  if (!apiKey) {
    return NextResponse.json(
      { error: 'API key is required' },
      { status: 401 }
    );
  }

  const key = await prisma.apiKey.findFirst({
    where: {
      key: apiKey,
      isActive: true,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ]
    },
    include: {
      user: {
        select: {
          is_api_enabled: true
        }
      }
    }
  });
  if (!key || !key.user.is_api_enabled) {
    return NextResponse.json(
      { error: 'Invalid API key' },
      { status: 401 }
    );
  }
  // Update API key usage
  await prisma.apiKey.update({
    where: { key: apiKey },
    data: { lastUsed: new Date() }
  });


  const { allowed, retryAfter } = await rateLimiter(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many requests, please try again later' },
      { status: 429, headers: { 'Retry-After': `${retryAfter}` } }
    );
  }
  try {
    const { templateId, placeholders, email } = await request.json();
    // Validate required fields
    if (!templateId || !placeholders || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    // Validate email
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }
    // Get template
    const template = await prisma.template.findUnique({
      where: { id: templateId }
    });
    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }
    // Validate placeholders
    const requiredPlaceholders = (template.placeholders as any[]).map(p => p.name.toLowerCase());
    const providedPlaceholders = Object.keys(placeholders).map(k => k.toLowerCase());
    const missingPlaceholders = requiredPlaceholders.filter(
      p => !providedPlaceholders.includes(p)
    );
    if (missingPlaceholders.length > 0) {
      return NextResponse.json({
        error: 'Missing required placeholders',
        missing: missingPlaceholders
      }, { status: 400 });
    }
    // Generate certificate image
    const image = await loadImage(template.imageUrl);
    const canvas = createCanvas(template.width, template.height);
    const ctx = canvas.getContext('2d');
    // Draw template
    ctx.drawImage(image, 0, 0);
    // Add placeholders
    (template.placeholders as any[])?.forEach((placeholder: any) => {
      const key = Object.keys(placeholders).find(k => k.toLowerCase() === placeholder.name.toLowerCase());
      const value = key ? placeholders[key].trim() : null;

      if (value) {
        const canvasFontSize = placeholder.style.fontSize;

        ctx.textBaseline = 'middle';
        ctx.font = `${placeholder.style.fontWeight} ${canvasFontSize}px ${placeholder.style.fontFamily}`;
        ctx.fillStyle = placeholder.style.fontColor;
        ctx.textAlign = placeholder.style.textAlign as CanvasTextAlign;

        let x = placeholder.position.x;
        if (placeholder.style.textAlign === 'right') {
          ctx.textAlign = 'right';
        } else if (placeholder.style.textAlign === 'center') {
          ctx.textAlign = 'center';
        } else {
          ctx.textAlign = 'left';
        }

        ctx.fillText(value, x, placeholder.position.y);
      }
    });
    // Add signatures
    if (template.signatures) {
      await Promise.all((template.signatures as any[]).map(async (signature: any) => {
        if (signature.imageUrl) {
          try {
            const signatureImage = await loadImage(signature.imageUrl);

            // Calculate scale factors to maintain aspect ratio
            const scaleWidth = signature.style.Width / signatureImage.width;
            const scaleHeight = signature.style.Height / signatureImage.height;
            const scale = Math.min(scaleWidth, scaleHeight);

            // Calculate scaled dimensions
            const scaledWidth = signatureImage.width * scale;
            const scaledHeight = signatureImage.height * scale;
            // Center the signature at the specified position
            const adjustedX = signature.position.x - (scaledWidth / 2);
            const adjustedY = signature.position.y - (scaledHeight / 2);
            ctx.drawImage(
              signatureImage,
              adjustedX,
              adjustedY,
              scaledWidth,
              scaledHeight
            );
          } catch (error) {
            console.error(`Failed to load signature image: ${signature.imageUrl}`, error);
          }
        }
      }));
    }
    // Create certificate record
    const certificate = await prisma.certificate.create({
      data: {
        templateId,
        uniqueIdentifier: `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        data: placeholders,
        generatedImageUrl: '',
        creatorId: template.creatorId,
      },
    });
    // Add QR code if template has QR placeholders
    if (template.qrPlaceholders) {
      await Promise.all((template.qrPlaceholders as any[]).map(async (qrPlaceholder: any) => {
        const qrData = `${process.env.NEXT_PUBLIC_BASE_URL}/validate/${certificate.uniqueIdentifier}`;
        const qrBuffer = await generateQRCode(qrData);
        const qrImage = await loadImage(qrBuffer);
        const adjustedX = qrPlaceholder.position.x - (qrPlaceholder.style.Width / 2);
        const adjustedY = qrPlaceholder.position.y - (qrPlaceholder.style.Height / 2);
        ctx.drawImage(
          qrImage,
          adjustedX,
          adjustedY,
          qrPlaceholder.style.Width,
          qrPlaceholder.style.Height
        );
      }));
    }
    // Upload to S3
    const buffer = canvas.toBuffer('image/png');
    const key = `certificates/${certificate.uniqueIdentifier}.png`;
    const certificateUrl = await uploadToS3(buffer, key);
    // Update certificate with URL
    await prisma.certificate.update({
      where: { id: certificate.id },
      data: { generatedImageUrl: certificateUrl },
    });
    const emailConfig = await prisma.emailConfig.findUnique({
      where: { userId: template.creatorId }
    });
    const emailSubject = replaceVariables(emailConfig?.defaultSubject || 'Your Certificate', placeholders);
    const emailMessage = replaceVariables(emailConfig?.defaultMessage || 'Please find your certificate attached.', placeholders);
    const emailHeading = replaceVariables(emailConfig?.emailHeading || 'Congratulations on receiving your certificate!', placeholders);
    const htmlContent = `
      <div style="background-color: #f0f4f8; padding: 100px 0;">
        <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #d0d7de; border-radius: 10px; padding: 20px; background-color: #ffffff;">
          ${emailConfig?.logoUrl ? `
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="${emailConfig.logoUrl}" alt="Logo" style="height: 50px;" />
          </div>
          ` : ''}
          <h1 style="font-size: 24px; text-align: center; margin: 0 0 20px 0; color: #004085;">
            ${emailHeading}
          </h1>
          <p style="font-size: 16px; color: #555; text-align: center;">
            ${emailMessage}
          </p>
          <div style="text-align: center; margin-top: 30px;">
            <a href="${certificateUrl}" style="background-color: #007BFF; color: #fff; padding: 12px 30px; font-size: 16px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Download Certificate
            </a>
          </div>
          
          <!-- AWS Compliance Footer -->
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
            <p style="font-size: 11px; color: #999; text-align: center; margin: 5px 0;">
              Certificate Link: <a href="${certificateUrl}" style="color: #007BFF; word-break: break-all; text-decoration: none;">${certificateUrl}</a>
            </p>
            <p style="font-size: 10px; color: #aaa; text-align: center; margin: 5px 0;">
              This link is provided for verification and AWS SES compliance.
            </p>
          </div>
          
          <footer style="margin-top: 30px; text-align: center; font-size: 14px; color: #777;">
            <p style="margin: 10px 0;">
              Having trouble with your certificate? Contact us at
              <a href="mailto:${emailConfig?.supportEmail}" style="color: #007BFF; text-decoration: none;">
                ${emailConfig?.supportEmail}
              </a>
            </p>
            <p style="margin-top: 15px; font-size: 12px;">
              <a href="${process.env.NEXT_PUBLIC_BASE_URL}/unsubscribe?email=${email}" style="color: #007BFF; text-decoration: none;">
                Unsubscribe from ${emailConfig?.organizationName || 'our emails'}
              </a>
            </p>
          </footer>
        </div>
      </div>
    `;
    // Queue email if Redis is available
    if (emailQueue) {
      await emailQueue.add('sendEmail', {
        email,
        emailFrom: process.env.EMAIL_FROM,
        emailSubject,
        emailMessage,
        htmlContent,
        ccEmails: [],
        bccEmails: [],
      });
    } else {
      console.warn('Email queue not available - email will not be sent');
    }
    return NextResponse.json({
      success: true,
      certificateUrl,
      certificateId: certificate.uniqueIdentifier
    });
  } catch (error) {
    console.error('Certificate generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate certificate' },
      { status: 500 }
    );
  }
}
