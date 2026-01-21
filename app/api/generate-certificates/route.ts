export const runtime = 'nodejs';
import QRCode from 'qrcode';

import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import { parse } from 'csv-parse/sync';
import { uploadToS3 } from '@/app/lib/s3';
import { createCanvas, loadImage, registerFont } from 'canvas';
import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';
import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import path from 'path';
import { checkUserRateLimit } from '@/app/lib/rate-limiter';

// ----------------------------------------
// Font Registration (if you need custom fonts)
// ----------------------------------------
registerFont(path.join(process.cwd(), 'public/fonts/MonteCarlo-Regular.ttf'), { family: 'MonteCarlo' });
registerFont(path.join(process.cwd(), 'public/fonts/AlexBrush-Regular.ttf'), { family: 'AlexBrush' });
registerFont(path.join(process.cwd(), 'public/fonts/Birthstone-Regular.ttf'), { family: 'Birthstone' });
registerFont(path.join(process.cwd(), 'public/fonts/DancingScript-Regular.ttf'), { family: 'DancingScript' });
registerFont(path.join(process.cwd(), 'public/fonts/LibreBaskerville-Regular.ttf'), { family: 'LibreBaskerville' });

interface FileLike {
  arrayBuffer: () => Promise<ArrayBuffer>;
  text: () => Promise<string>;
  name?: string;
  size?: number;
  type?: string;
}

if (!process.env.REDIS_URL) {
  throw new Error('REDIS_URL is not defined in environment variables');
}

// ----------------------------------------
// Redis connection
// ----------------------------------------
const connection = new IORedis(process.env.REDIS_URL, {
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

// ----------------------------------------
// Email Queue & Worker
// ----------------------------------------
const emailQueue = new Queue('emailQueue', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  },
});

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

const emailWorker = new Worker(
  'emailQueue',
  async (job) => {
    const {
      email,
      emailFrom,
      emailSubject,
      emailMessage,
      htmlContent,
      ccEmails,
      bccEmails,
      userId,
      batchId,
    } = job.data;

    // Check user-specific rate limit
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { emailRateLimit: true, emailDailyLimit: true },
    });

    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    const rateLimitCheck = await checkUserRateLimit(
      userId,
      user.emailRateLimit,
      user.emailDailyLimit
    );

    if (!rateLimitCheck.allowed) {
      // Delay the job and retry later
      console.log(`Rate limit exceeded for user ${userId}: ${rateLimitCheck.reason}`);
      throw new Error(`Rate limit exceeded: ${rateLimitCheck.reason}`);
    }

    if (!isValidEmail(email)) {
      throw new Error(`Invalid email address: ${email}`);
    }

    try {
      const mailOptions = {
        from: emailFrom,
        to: email,
        cc: ccEmails.filter(isValidEmail),
        bcc: bccEmails.filter(isValidEmail),
        subject: emailSubject,
        text: emailMessage,
        html: htmlContent,
        headers: {
          'X-User-Id': userId,
          'X-Batch-Id': batchId
        },
        Tags: [
          { Name: 'userId', Value: userId },
          { Name: 'batchId', Value: batchId }
        ]
      };

      // Create transporter for sending email
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail(mailOptions);
      console.log(`Email sent to ${email} for user ${userId}`);
    } catch (emailError) {
      console.error(`Failed to send email to ${email}:`, emailError);
      throw emailError; // triggers BullMQ retry
    }
  },
  {
    connection,
    // Removed global rate limiter - now using per-user rate limiting
  }
);

emailWorker.on('error', (err) => {
  console.error('Email worker error:', err);
});

emailWorker.on('failed', (job, err) => {
  if (job) {
    console.error(`Email job ${job.id} failed with error:`, err);
    console.log(`Attempt ${job.attemptsMade} of ${job.opts.attempts}`);
  } else {
    console.error('An email job failed but job details are unavailable:', err);
  }
});

emailWorker.on('completed', (job) => {
  if (job) {
    console.log(`Email job ${job.id} completed successfully`);
  } else {
    console.log('An email job completed but job details are unavailable');
  }
});

// ----------------------------------------
// Helper functions
// ----------------------------------------
function isFileLike(value: any): value is FileLike {
  return (
    value &&
    typeof value.arrayBuffer === 'function' &&
    typeof value.text === 'function' &&
    (typeof value.name === 'string' || typeof value.name === 'undefined')
  );
}

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

async function generateQRCode(data: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    QRCode.toBuffer(
      data,
      {
        errorCorrectionLevel: 'H',
        margin: 1,
        width: 200,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      },
      (err, buffer) => {
        if (err) reject(err);
        else resolve(buffer);
      }
    );
  });
}

function replaceVariables(text: string, data: Record<string, string>): string {
  return text.replace(/~([A-Za-z][A-Za-z0-9_]*)~/g, (match, variable) => {
    const cleanVariable = variable.trim();
    const key = Object.keys(data).find(
      (k) => k.toLowerCase() === cleanVariable.toLowerCase()
    );
    return key ? data[key].trim() : match;
  });
}

// ----------------------------------------
// NEW: Certificate queue & worker
// ----------------------------------------
const certificateQueue = new Queue('certificateQueue', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: true,
    removeOnFail: 100,
  },
});

/**
 * Generate the certificate image, draw placeholders & signatures,
 * create the record in DB, upload to S3, etc.
 */
async function generateCertificateImage(
  record: Record<string, string>,
  template: any,
  userId: string,
  batchId: string
) {
  // 1. Load the template image
  const image = await loadImage(template.imageUrl);
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');

  // 2. Draw the base template
  ctx.drawImage(image, 0, 0);

  // 3. Draw text placeholders
  if (template.placeholders) {
    for (const placeholder of template.placeholders) {
      const key = Object.keys(record).find(
        (k) => k.toLowerCase() === placeholder.name.toLowerCase()
      );
      const value = key ? record[key].trim() : null;
      if (value) {
        ctx.textBaseline = 'middle';
        ctx.font = `${placeholder.style.fontWeight} ${placeholder.style.fontSize}px ${placeholder.style.fontFamily}`;
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
    }
  }

  // 4. Draw signatures
  if (template.signatures) {
    await Promise.all(
      template.signatures.map(async (signature: any) => {
        if (!signature.imageUrl) return;
        try {
          const signatureImage = await loadImage(signature.imageUrl);
          // scale signature to fit bounding box
          const scaleWidth = signature.style.Width / signatureImage.width;
          const scaleHeight = signature.style.Height / signatureImage.height;
          const scale = Math.min(scaleWidth, scaleHeight);
          const scaledWidth = signatureImage.width * scale;
          const scaledHeight = signatureImage.height * scale;
          const adjustedX = signature.position.x - scaledWidth / 2;
          const adjustedY = signature.position.y - scaledHeight / 2;
          ctx.drawImage(signatureImage, adjustedX, adjustedY, scaledWidth, scaledHeight);
        } catch (error) {
          console.error(`Failed to load signature image: ${signature.imageUrl}`, error);
        }
      })
    );
  }

  // 5. Draw QR placeholders
  if (template.qrPlaceholders) {
    // We first create a certificate record to have a uniqueIdentifier
    // then we draw the QR with its validation link
  }

  // Create the certificate record first, so we have an ID
  const certificate = await prisma.certificate.create({
    data: {
      templateId: template.id,
      batchId,
      uniqueIdentifier: `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      data: record,
      generatedImageUrl: '', // we'll update after we upload to S3
      creatorId: userId,
    },
  });

  // If you have QR placeholders that rely on certificate.uniqueIdentifier:
  if (template.qrPlaceholders) {
    await Promise.all(
      template.qrPlaceholders.map(async (qrPlaceholder: any) => {
        const qrData = `${process.env.NEXT_PUBLIC_BASE_URL}/validate/${certificate.uniqueIdentifier}`;
        const qrBuffer = await generateQRCode(qrData);
        const qrImage = await loadImage(qrBuffer);
        const adjustedX = qrPlaceholder.position.x - qrPlaceholder.style.Width / 2;
        const adjustedY = qrPlaceholder.position.y - qrPlaceholder.style.Height / 2;
        ctx.drawImage(
          qrImage,
          adjustedX,
          adjustedY,
          qrPlaceholder.style.Width,
          qrPlaceholder.style.Height
        );
      })
    );
  }

  // Now that we've drawn everything, convert to buffer and upload
  const buffer = canvas.toBuffer('image/png');
  const key = `certificates/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.png`;
  const certificateUrl = await uploadToS3(buffer, key);

  // Update the certificate record with the final URL
  const updatedCertificate = await prisma.certificate.update({
    where: { id: certificate.id },
    data: { generatedImageUrl: certificateUrl },
  });

  return { certificateUrl, certificate: updatedCertificate };
}

/**
 * Prepare email data with replaced placeholders, etc.
 */
async function prepareEmailData(
  emailAddress: string,
  record: Record<string, string>,
  certificateUrl: string,
  emailConfig: any,
  emailFrom: string,
  ccEmails: string[],
  bccEmails: string[],
  userId: string,
  batchId: string
) {
  const emailSubject = replaceVariables(
    emailConfig?.defaultSubject || 'Your Certificate',
    record
  );
  const emailMessage = replaceVariables(
    emailConfig?.defaultMessage || 'Please find your certificate attached.',
    record
  );
  const emailHeading = replaceVariables(
    emailConfig?.emailHeading || 'Congratulations on receiving your certificate!',
    record
  );

  // Example email HTML
  const htmlContent = `
    <div style="background-color: #f0f4f8; padding: 50px;">
      <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; background: #fff; padding: 20px;">
        ${emailConfig?.logoUrl
      ? `<div style="text-align: center; margin-bottom: 20px;">
                 <img src="${emailConfig.logoUrl}" alt="Logo" height="50" />
               </div>`
      : ''
    }
        <h2 style="color: #333; text-align: center;">${emailHeading}</h2>
        <p style="color: #555;">${emailMessage}</p>
        <p style="text-align: center;">
          <a href="${certificateUrl}" style="text-decoration: none; color: #007BFF;">
            Download your certificate
          </a>
        </p>
        <footer style="margin-top: 30px; text-align: center; font-size: 14px; color: #777;">
          <p>
            Having trouble with your certificate? Contact us at
            <a href="mailto:${emailConfig?.supportEmail}" style="color: #007BFF; text-decoration: none;">
              ${emailConfig?.supportEmail}
            </a>
          </p>
        </footer>
      </div>
    </div>
  `;

  return {
    email: emailAddress,
    emailFrom,
    emailSubject,
    emailMessage,
    htmlContent,
    ccEmails,
    bccEmails,
    userId,
    batchId
  };
}

/**
 * The worker that processes jobs in "certificateQueue".
 * Each job has a sub-batch of records from the CSV.
 */
const certificateWorker = new Worker(
  'certificateQueue',
  async (job) => {
    const {
      records,
      templateId,
      batchId,
      userId,
      emailFrom,
      ccEmails,
      bccEmails,
      batchIndex,
      totalBatches,
    } = job.data;

    // 1. Fetch the template & email config
    const template = await prisma.template.findUnique({ where: { id: templateId } });
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }
    const emailConfig = await prisma.emailConfig.findUnique({ where: { userId } });

    // 2. Process each record in sub-chunks
    const concurrencyLimit = 10;
    const invalidEmails: { email: string; reason: string }[] = [];

    const chunks: Record<string, string>[][] = [];
    for (let i = 0; i < records.length; i += concurrencyLimit) {
      chunks.push(records.slice(i, i + concurrencyLimit));
    }

    for (const chunk of chunks) {
      await Promise.all(
        chunk.map(async (record) => {
          try {
            // Generate certificate image
            const { certificateUrl } = await generateCertificateImage(
              record,
              template,
              userId,
              batchId
            );

            // Queue up the email if "email" field is present
            const emailKey = Object.keys(record).find((k) => k.toLowerCase() === 'email');
            if (emailKey) {
              const emailAddress = record[emailKey].trim();
              if (isValidEmail(emailAddress)) {
                const emailData = await prepareEmailData(
                  emailAddress,
                  record,
                  certificateUrl,
                  emailConfig,
                  emailFrom,
                  ccEmails,
                  bccEmails,
                  userId,
                  batchId
                );
                await emailQueue.add('sendEmail', emailData);
              } else {
                invalidEmails.push({
                  email: emailAddress,
                  reason: 'Invalid email format',
                });
              }
            }
          } catch (error: any) {
            console.error('Error processing certificate:', error);
            // Store failed record for debugging/retry
            await prisma.failedCertificate.create({
              data: {
                batchId,
                data: record,
                error: error.message,
              },
            });
          }
        })
      );
    }

    // 3. Store invalid emails
    if (invalidEmails.length > 0) {
      await prisma.invalidEmail.createMany({
        data: invalidEmails.map(({ email, reason }) => ({
          email,
          reason,
          batchId,
        })),
      });
    }

    // 4. Update batch progress
    await prisma.batch.update({
      where: { id: batchId },
      data: {
        progress: Math.round(((batchIndex + 1) / totalBatches) * 100),
      },
    });
  },
  {
    connection,
    concurrency: 5, // process up to 5 sub-batches concurrently
    limiter: {
      max: 100, // up to 100 jobs/sec
      duration: 1000,
    },
  }
);

certificateWorker.on('error', (err) => {
  console.error('Certificate worker error:', err);
});

// ----------------------------------------
// POST Handler: Only enqueues work (no inline generation)
// ----------------------------------------
export async function POST(request: Request) {
  // 1. Auth
  const userId = getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Parse form data
  const formData = await request.formData();
  const batchName = formData.get('batchName') as string;
  const csvFile = formData.get('csv');
  const templateId = formData.get('templateId') as string;
  const ccEmails = (formData.get('ccEmails') as string || '')
    .split(',')
    .map((email) => email.trim())
    .filter((email) => email);
  const bccEmails = (formData.get('bccEmails') as string || '')
    .split(',')
    .map((email) => email.trim())
    .filter((email) => email);

  if (!csvFile) {
    return NextResponse.json({ error: 'No CSV file provided' }, { status: 400 });
  }
  if (!batchName) {
    return NextResponse.json({ error: 'Batch name is required' }, { status: 400 });
  }
  if (!templateId) {
    return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
  }
  if (!isFileLike(csvFile)) {
    return NextResponse.json({ error: 'Invalid CSV file' }, { status: 400 });
  }

  // 3. Validate user & tokens
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tokens: true, email: true },
  });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // 4. Parse CSV
  const csvText = await csvFile.text();
  const records = parse(csvText, { columns: true });
  const tokensNeeded = records.length;
  if (user.tokens < tokensNeeded) {
    return NextResponse.json(
      {
        error: 'Insufficient tokens',
        required: tokensNeeded,
        available: user.tokens,
      },
      { status: 400 }
    );
  }

  // 5. Transaction: Deduct tokens, create batch
  const { batch } = await prisma.$transaction(async (tx: any) => {
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: {
        tokens: { decrement: tokensNeeded },
      },
    });

    const newBatch = await tx.batch.create({
      data: {
        name: batchName,
        creatorId: userId,
      },
    });

    await tx.tokenTransaction.create({
      data: {
        userId,
        amount: tokensNeeded,
        type: 'DEDUCT',
        reason: 'certificate_generation',
        email: updatedUser.email,
      },
    });

    return { batch: newBatch };
  });

  // 6. Confirm template ownership
  const template = await prisma.template.findUnique({ where: { id: templateId } });
  if (!template || template.creatorId !== userId) {
    return NextResponse.json({ error: 'Unauthorized access to template' }, { status: 403 });
  }

  // 7. Split records into sub-batches & enqueue
  const BATCH_SIZE = 100;
  const emailConfig = await prisma.emailConfig.findUnique({ where: { userId } });
  const totalRecords = records.length;
  const batches = [];
  for (let i = 0; i < totalRecords; i += BATCH_SIZE) {
    batches.push(records.slice(i, i + BATCH_SIZE));
  }

  await Promise.all(
    batches.map((batchRecords, index) =>
      certificateQueue.add('generateCertificates', {
        records: batchRecords,
        templateId,
        batchId: batch.id,
        userId,
        emailFrom: emailConfig?.customEmail || process.env.EMAIL_FROM,
        ccEmails,
        bccEmails,
        batchIndex: index,
        totalBatches: batches.length,
      })
    )
  );

  // 8. Return response (no certificates created inline)
  return NextResponse.json({
    message: 'Certificate generation started',
    batchId: batch.id,
    totalCertificates: totalRecords,
  });
}
