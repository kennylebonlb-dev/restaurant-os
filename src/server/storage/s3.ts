import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const bucketName = process.env.S3_BUCKET_NAME;

export const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1"
});

export function getRestaurantImageKey(restaurantId: string, fileName: string) {
  const safeFileName = fileName.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
  return `restaurants/${restaurantId}/${Date.now()}-${safeFileName}`;
}

export async function createImageUploadUrl(key: string, contentType: string) {
  if (!bucketName) {
    throw new Error("S3_BUCKET_NAME is not configured.");
  }

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType
  });

  return getSignedUrl(s3Client, command, { expiresIn: 60 * 5 });
}

export async function deleteImage(key: string) {
  if (!bucketName) {
    throw new Error("S3_BUCKET_NAME is not configured.");
  }

  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key
    })
  );
}
