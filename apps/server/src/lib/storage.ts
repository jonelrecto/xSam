import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const R2_ENDPOINT = process.env.R2_ENDPOINT;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "exam-drawings";
const R2_PUBLIC_DOMAIN = process.env.R2_PUBLIC_DOMAIN || "http://localhost:4000/uploads";

let s3Client: S3Client | null = null;
if (R2_ENDPOINT && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_ACCESS_KEY_ID !== "mock-access-key") {
  s3Client = new S3Client({
    endpoint: R2_ENDPOINT,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
    region: "auto",
  });
}

export async function uploadToStorage(
  destinationKey: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  // 1. Primary: Cloudflare R2 / S3 Storage
  if (s3Client) {
    try {
      await s3Client.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: destinationKey,
          Body: buffer,
          ContentType: contentType,
        })
      );
      return `${R2_PUBLIC_DOMAIN}/${destinationKey}`;
    } catch (err) {
      console.warn("⚠️ R2 upload failed, resorting to local storage...", err);
    }
  }

  // 2. Dev Local Disk Fallback
  const uploadsDir = path.join(process.cwd(), "public", "uploads", path.dirname(destinationKey));
  fs.mkdirSync(uploadsDir, { recursive: true });
  const filePath = path.join(process.cwd(), "public", "uploads", destinationKey);
  fs.writeFileSync(filePath, buffer);

  return `${process.env.APP_BASE_URL || "http://localhost:4000"}/uploads/${destinationKey}`;
}

export const uploadToR2 = uploadToStorage;
