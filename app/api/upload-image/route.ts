// /api/upload-image/route.ts

export const runtime = 'nodejs';

import { NextResponse } from "next/server";
import { uploadToS3 } from "@/app/lib/s3";

interface FileLike {
  arrayBuffer: () => Promise<ArrayBuffer>;
  name?: string;
}

function isFileLike(value: any): value is FileLike {
  return (
    value &&
    typeof value.arrayBuffer === "function" &&
    (typeof value.name === "string" || typeof value.name === "undefined")
  );
}

export async function POST(request: Request) {
  try {

    // Parse the form data from the request
    const formData = await request.formData();
    const image = formData.get("image");

    if (!image) {
      return NextResponse.json({ error: "No file received" }, { status: 400 });
    }

    if (!isFileLike(image)) {
      console.error("Invalid file received:", image);
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    // Convert the Blob to a Buffer
    const arrayBuffer = await image.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = image.type || "application/octet-stream"; // Get the content type
    const key = `templates/${Date.now()}-${image.name || "image"}`;

    // Upload the file to S3
    const imageUrl = await uploadToS3(buffer, key, contentType);

    // Return the URL of the uploaded file
    return NextResponse.json({ imageUrl });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}
