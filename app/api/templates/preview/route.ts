import { NextResponse } from 'next/server';
import { createCanvas, loadImage, registerFont } from 'canvas';
import jwt from 'jsonwebtoken';
import path from 'path';

registerFont(path.join(process.cwd(), 'public/fonts/MonteCarlo-Regular.ttf'), { family: 'MonteCarlo' });
registerFont(path.join(process.cwd(), 'public/fonts/AlexBrush-Regular.ttf'), { family: 'AlexBrush' });
registerFont(path.join(process.cwd(), 'public/fonts/Birthstone-Regular.ttf'), { family: 'Birthstone' });
registerFont(path.join(process.cwd(), 'public/fonts/DancingScript-Regular.ttf'), { family: 'DancingScript' });
registerFont(path.join(process.cwd(), 'public/fonts/LibreBaskerville-Regular.ttf'), { family: 'LibreBaskerville' });

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

function calculateCanvasFontSize(fontSize: number, templateWidth: number, canvasWidth: number): number {
  const scaleFactor = canvasWidth / templateWidth;
  return fontSize * scaleFactor;
}

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    // Authenticate request
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { imageUrl, placeholders, width, height, signatures, qrPlaceholders } = body;  

    if (!imageUrl || !width || !height) {
      return NextResponse.json(
        { error: 'Missing required fields: imageUrl, width, or height' },
        { status: 400 }
      );
    }

    // Load and create canvas
    const templateImage = await loadImage(imageUrl);
    const canvas = createCanvas(templateImage.width, templateImage.height);
    const ctx = canvas.getContext('2d');

    // Draw template image
    ctx.drawImage(templateImage, 0, 0);

    // Add placeholders
    if (placeholders?.length > 0) {
      placeholders.forEach((placeholder: any) => {
        const { previewValue, position, style } = placeholder;
        
        if (previewValue) {
          const canvasFontSize = style.fontSize;

          ctx.textBaseline = 'middle'; 
          ctx.font = `${placeholder.style.fontWeight} ${canvasFontSize}px ${placeholder.style.fontFamily}`;
          console.log(`${ctx.font}`)
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

          ctx.fillText(previewValue, x, position.y);
        }
      });
    }

    // Add signatures if present
    if (signatures?.length > 0) {
      await Promise.all(signatures.map(async (signature: any) => {
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

    if (qrPlaceholders?.length > 0) {
      await Promise.all(qrPlaceholders.map(async (qrPlaceholder: any) => {
        try {
          // Load QR placeholder image
          const qrImagePath = path.join(process.cwd(), 'public', 'qrplaceholder.png');
          const qrImage = await loadImage(qrImagePath); 
          
          // Calculate position and dimensions
          const adjustedX = qrPlaceholder.position.x - (qrPlaceholder.style.Width / 2);
          const adjustedY = qrPlaceholder.position.y - (qrPlaceholder.style.Height / 2);

          // Draw QR placeholder
          ctx.drawImage(
            qrImage,
            adjustedX,
            adjustedY,
            qrPlaceholder.style.Width,
            qrPlaceholder.style.Height
          );
        } catch (error) {
          console.error('Failed to load QR placeholder image:', error);
        }
      }));
    }

    // Convert canvas to data URL
    const previewDataUrl = canvas.toDataURL('image/png');

    return NextResponse.json({ previewUrl: previewDataUrl });
  } catch (error) {
    console.error('Error generating template preview:', error);
    return NextResponse.json(
      { error: 'Failed to generate preview' },
      { status: 500 }
    );
  }
}