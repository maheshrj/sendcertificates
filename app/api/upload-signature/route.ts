export const runtime = 'nodejs';

import { NextResponse } from "next/server";
import { uploadToS3 } from "@/app/lib/s3";

interface FileLike {
  arrayBuffer: () => Promise<ArrayBuffer>;
  name?: string;
  type?: string;
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
    console.log("Received request to /api/upload-signature");

    // Parse the form data from the request
    const formData = await request.formData();
    console.log("Form data parsed");
    const signature = formData.get("signature");
    console.log("Signature retrieved from form data:", signature);

    if (!signature) {
      console.error("No file received:", signature);
      return NextResponse.json({ error: "No file received" }, { status: 400 });
    }

    if (!isFileLike(signature)) {
      console.error("Invalid file received:", signature);
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    // Convert the Blob to a Buffer
    console.log("Converting signature to arrayBuffer");
    const arrayBuffer = await signature.arrayBuffer();
    console.log("ArrayBuffer obtained");
    const buffer = Buffer.from(arrayBuffer);
    console.log("Buffer created from ArrayBuffer");
    const contentType = signature.type || "application/octet-stream"; // Get the content type
    const key = `signatures/${Date.now()}-${signature.name || "signature"}`;
    console.log("Key for S3 upload:", key);

    // Upload the file to S3
    console.log("Uploading signature to S3");
    const signatureUrl = await uploadToS3(buffer, key, contentType);
    console.log("Signature uploaded to S3, URL:", signatureUrl);

    // Return the URL of the uploaded file
    return NextResponse.json({ signatureUrl });
  } catch (error) {
    console.error("Error uploading signature:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}
