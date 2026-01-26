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
import { checkSESRateLimit } from '@/app/lib/ses-rate-limiter';

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


let connection: IORedis | null = null;
let emailQueue: Queue | null = null;
let certificateQueue: Queue | null = null;
let emailWorker: Worker | null = null;
let certificateWorker: Worker | null = null;

// Only initialize Redis if REDIS_URL is available
if (process.env.REDIS_URL) {
  try {
    // ----------------------------------------
    // Redis connection
    // ----------------------------------------  try {
    let connectionAttempts = 0;
    const MAX_RETRY_ATTEMPTS = 10;

    connection = new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      connectTimeout: 10000, // 10 seconds
      retryStrategy(times) {
        connectionAttempts = times;

        // Stop retrying after max attempts
        if (times > MAX_RETRY_ATTEMPTS) {
          console.error(`❌ Redis connection failed after ${MAX_RETRY_ATTEMPTS} attempts`);
          return null; // Stop retrying
        }

        // Exponential backoff: 1s, 2s, 4s, 8s, max 10s
        const delay = Math.min(times * 1000, 10000);
        console.log(`🔄 Redis retry attempt ${times}/${MAX_RETRY_ATTEMPTS}, waiting ${delay}ms`);
        return delay;
      },
      reconnectOnError(err) {
        console.error('🔄 Redis reconnect on error:', err.message);
        // Reconnect on all errors
        return true;
      }
    });

    // Connection event handlers
    connection.on('error', (error) => {
      console.error('❌ Redis connection error:', error.message);
      connectionAttempts++;
    });

    connection.on('connect', () => {
      console.log('✅ Successfully connected to Redis');
      connectionAttempts = 0;
    });

    connection.on('ready', () => {
      console.log('✅ Redis is ready to accept commands');
    });

    connection.on('reconnecting', (delay) => {
      console.log(`🔄 Redis reconnecting in ${delay}ms...`);
    });

    connection.on('close', () => {
      console.warn('⚠️ Redis connection closed');
    });

    connection.on('end', () => {
      console.warn('⚠️ Redis connection ended');
    });

    // ----------------------------------------
    // Email Queue & Worker
    // ----------------------------------------
    emailQueue = new Queue('emailQueue', {
      connection,
      defaultJobOptions: {
        attempts: 5, // Retry up to 5 times
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: {
          age: 24 * 3600, // Keep completed jobs for 24 hours
          count: 1000, // Keep last 1000 completed jobs
        },
        removeOnFail: {
          age: 7 * 24 * 3600, // Keep failed jobs for 7 days
        },
      },
    });

    // Queue event handlers
    emailQueue.on('error', (error) => {
      console.error('❌ Email queue error:', error.message);
    });

  } catch (error) {
    console.error('❌ Failed to initialize Redis for generate-certificates:', error);
    connection = null;
    emailQueue = null;
  }
} else {
  console.warn('⚠️ REDIS_URL not configured - queues will be disabled for generate-certificates');
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Initialize email worker only if connection is available
if (connection && emailQueue) {
  emailWorker = new Worker(
    'emailQueue',
    async (job) => {
      const {
        email,
        emailFrom,
        emailSubject,
        emailMessage,
        htmlContent,
        plainTextContent,
        ccEmails,
        bccEmails,
        userId,
        batchId,
        unsubscribeUrl,
        messageId,
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

      // Check suppression list
      const suppressed = await prisma.suppressionList.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (suppressed) {
        console.log(`Email ${email} is suppressed (${suppressed.reason}). Skipping.`);
        // Don't throw error - just skip this email
        return;
      }

      // Check global SES rate limit
      const sesRateLimitCheck = await checkSESRateLimit();
      if (!sesRateLimitCheck.allowed) {
        console.log(`Global SES rate limit exceeded: ${sesRateLimitCheck.reason}`);
        throw new Error(`SES rate limit exceeded: ${sesRateLimitCheck.reason}`);
      }

      try {
        // Get email config for support email
        const emailConfig = await prisma.emailConfig.findUnique({
          where: { userId },
        });

        const mailOptions = {
          from: emailFrom,
          to: email,
          cc: ccEmails.filter(isValidEmail),
          bcc: bccEmails.filter(isValidEmail),
          subject: emailSubject,
          text: plainTextContent || emailMessage,
          html: htmlContent,
          headers: {
            'X-User-Id': userId,
            'X-Batch-Id': batchId,
            'X-Entity-Ref-ID': messageId,
            'Reply-To': emailConfig?.supportEmail || process.env.SUPPORT_EMAIL || emailFrom,
            'List-Unsubscribe': `<mailto:unsubscribe@${process.env.NEXT_PUBLIC_BASE_URL?.replace('https://', '') || 'sendcertificates.com'}?subject=unsubscribe>, <${unsubscribeUrl}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            'Precedence': 'bulk',
          },
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
        console.log(`✅ Email sent successfully to ${email} for batch ${batchId}`);
      } catch (emailError: any) {
        // Enhanced error logging with categorization
        const { createErrorDetails, logError } = await import('@/app/lib/error-handler');

        const errorDetails = createErrorDetails(emailError, {
          email,
          batchId,
          additionalContext: {
            userId,
            emailFrom,
            ccCount: ccEmails?.length || 0,
            bccCount: bccEmails?.length || 0,
            attemptNumber: job?.attemptsMade || 0
          }
        });

        logError(errorDetails);

        // Throw error to trigger BullMQ retry
        throw new Error(`${errorDetails.category}: ${errorDetails.userMessage}`);
      }
    },
    {
      connection,
      concurrency: 5,
      limiter: {
        max: 10, // 10 emails per second (global SES limit)
        duration: 1000,
      },
    }
  );

  emailWorker.on('error', (err) => {
    console.error('❌ [EMAIL_WORKER_ERROR]', {
      error: err.message,
      timestamp: new Date().toISOString()
    });
  });

  emailWorker.on('failed', async (job, err) => {
    if (job) {
      const { createErrorDetails, logError } = await import('@/app/lib/error-handler');

      const errorDetails = createErrorDetails(err, {
        email: job.data.email,
        batchId: job.data.batchId,
        additionalContext: {
          jobId: job.id,
          attemptsMade: job.attemptsMade,
          maxAttempts: job.opts.attempts,
          finalAttempt: job.attemptsMade >= (job.opts.attempts || 3)
        }
      });

      logError(errorDetails);

      if (job.attemptsMade >= (job.opts.attempts || 3)) {
        console.error(`❌ [EMAIL_FINAL_FAILURE] Job ${job.id} failed permanently after ${job.attemptsMade} attempts`);
      } else {
        console.log(`⚠️  [EMAIL_RETRY] Job ${job.id} will retry (attempt ${job.attemptsMade}/${job.opts.attempts})`);
      }
    } else {
      console.error('❌ [EMAIL_JOB_FAILED] Job details unavailable:', err);
    }
  });

  emailWorker.on('completed', (job) => {
    if (job) {
      console.log(`✅ [EMAIL_SUCCESS] Job ${job.id} completed for ${job.data.email}`);
    }
  });
}

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
if (connection) {
  certificateQueue = new Queue('certificateQueue', {
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
}

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

  // Get recipient name for personalization
  const nameKey = Object.keys(record).find((k) => k.toLowerCase() === 'name');
  const recipientName = nameKey ? record[nameKey].trim() : '';

  // Use subject as-is (user can add variables like ~Name~ themselves)
  const personalizedSubject = emailSubject;

  // Generate unsubscribe URL
  const unsubscribeUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/unsubscribe?email=${encodeURIComponent(emailAddress)}`;

  // Generate unique message ID
  const messageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@${process.env.NEXT_PUBLIC_BASE_URL?.replace('https://', '') || 'sendcertificates.com'}`;

  // Get certificate unique identifier for validation
  const certIdKey = Object.keys(record).find((k) => k.toLowerCase() === 'certificateid');
  const validationUrl = certIdKey
    ? `${process.env.NEXT_PUBLIC_BASE_URL}/validate/${record[certIdKey]}`
    : null;

  // Generate plain text version
  const plainTextContent = `
${emailHeading}

${emailMessage}

Download your certificate: ${certificateUrl}

${validationUrl ? `Verify this certificate: ${validationUrl}\n\n` : ''}
---
This certificate was sent by ${emailConfig?.customDomain || 'SendCertificates'}

Questions? Contact us at ${emailConfig?.supportEmail || 'support@example.com'}

Unsubscribe from certificate emails: ${unsubscribeUrl}
  `.trim();

  // Enhanced email HTML with professional footer and prominent download button
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${personalizedSubject}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f0f4f8;">
      <div style="background-color: #f0f4f8; padding: 50px 20px;">
        <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          ${emailConfig?.logoUrl
      ? `<div style="text-align: center; margin-bottom: 20px;">
                 <img src="${emailConfig.logoUrl}" alt="Logo" height="50" />
               </div>`
      : ''
    }
          <h2 style="color: #333; text-align: center; margin-bottom: 20px;">${emailHeading}</h2>
          <p style="color: #555; font-size: 16px; text-align: center;">${emailMessage}</p>
          
          <!-- Download Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${certificateUrl}" style="display: inline-block; background-color: #007BFF; color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 5px; font-size: 16px; font-weight: bold;">
              Download Certificate
            </a>
          </div>
          
          ${validationUrl ? `
          <!-- Certificate Validation -->
          <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #555;">
              <strong>Verify this certificate:</strong><br>
              <a href="${validationUrl}" style="color: #007BFF; text-decoration: none;">${validationUrl}</a>
            </p>
          </div>
          ` : ''}
          
          <!-- Certificate Link (AWS SES Compliance) -->
          <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #e0e0e0;">
            <p style="font-size: 10px; color: #bbb; text-align: center; margin: 5px 0;">
              <a href="${certificateUrl}" style="color: #999; word-break: break-all; text-decoration: none;">${certificateUrl}</a>
            </p>
          </div>
          
          <!-- Professional Footer -->
          <footer style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; font-size: 12px; color: #777;">
            <p style="margin: 5px 0;">This certificate was sent by <strong>${emailConfig?.customDomain || 'SendCertificates'}</strong></p>
            <p style="margin: 5px 0;">
              Questions? Contact us at 
              <a href="mailto:${emailConfig?.supportEmail || 'support@example.com'}" style="color: #007BFF; text-decoration: none;">
                ${emailConfig?.supportEmail || 'support@example.com'}
              </a>
            </p>
            <p style="margin: 15px 0 5px 0;">
              <a href="${unsubscribeUrl}" style="color: #007BFF; text-decoration: none; font-size: 12px;">
                Unsubscribe
              </a>
            </p>
            <p style="margin: 10px 0; font-size: 11px; color: #999;">
              This is an automated message. Please do not reply to this email.
            </p>
          </footer>
        </div>
      </div>
    </body>
    </html>
  `;

  return {
    email: emailAddress,
    emailFrom,
    emailSubject: personalizedSubject,
    emailMessage,
    htmlContent,
    plainTextContent,
    ccEmails,
    bccEmails,
    userId,
    batchId,
    unsubscribeUrl,
    messageId,
  };
}

/**
 * The worker that processes jobs in "certificateQueue".
 * Each job has a sub-batch of records from the CSV.
 */
if (connection && certificateQueue) {
  certificateWorker = new Worker(
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
                  if (emailQueue) {
                    await emailQueue.add('sendEmail', emailData);
                  }
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
        max: 10, // up to 10 jobs/sec (aligned with SES limit)
        duration: 1000,
      },
    }
  );

  certificateWorker.on('error', (err) => {
    console.error('Certificate worker error:', err);
  });
}

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
    batches.map((batchRecords, index) => {
      if (certificateQueue) {
        return certificateQueue.add('generateCertificates', {
          records: batchRecords,
          templateId,
          batchId: batch.id,
          userId,
          emailFrom: emailConfig?.customEmail || process.env.EMAIL_FROM,
          ccEmails,
          bccEmails,
          batchIndex: index,
          totalBatches: batches.length,
        });
      }
      return Promise.resolve();
    })
  );

  // 8. Return response (no certificates created inline)
  return NextResponse.json({
    message: 'Certificate generation started',
    batchId: batch.id,
    totalCertificates: totalRecords,
  });
}
