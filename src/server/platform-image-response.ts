import { readFile } from "fs/promises";
import path from "path";

const contentTypes: Record<string, string> = {
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};
const imageCacheControl = "public, max-age=60, s-maxage=300, stale-while-revalidate=600";

function responseFromBuffer(buffer: Buffer, contentType: string) {
  const body = new ArrayBuffer(buffer.byteLength);
  new Uint8Array(body).set(buffer);

  return new Response(body, {
    headers: {
      "Cache-Control": imageCacheControl,
      "Content-Type": contentType
    }
  });
}

export function dataUrlImageResponse(dataUrl: string) {
  const base64Match = /^data:(image\/[a-zA-Z0-9.+-]+)(?:;charset=[^;,]+)?;base64,(.+)$/.exec(dataUrl);

  if (base64Match) {
    return responseFromBuffer(Buffer.from(base64Match[2], "base64"), base64Match[1]);
  }

  const encodedMatch = /^data:(image\/[a-zA-Z0-9.+-]+)(?:;charset=[^;,]+)?,(.+)$/.exec(dataUrl);

  if (encodedMatch) {
    return responseFromBuffer(Buffer.from(decodeURIComponent(encodedMatch[2])), encodedMatch[1]);
  }

  return null;
}

export async function publicImageResponse(fileUrl: string) {
  if (!fileUrl.startsWith("/") || fileUrl.startsWith("//")) {
    return null;
  }

  const safePath = path.normalize(fileUrl).replace(/^(\.\.[/\\])+/, "");
  const publicRoot = path.join(process.cwd(), "public");
  const publicPath = path.join(process.cwd(), "public", safePath);

  if (!publicPath.startsWith(publicRoot)) {
    return null;
  }

  try {
    const file = await readFile(publicPath);
    const extension = path.extname(publicPath).toLowerCase();

    return responseFromBuffer(file, contentTypes[extension] ?? "image/png");
  } catch {
    return null;
  }
}

export async function platformImageResponse(
  imageUrl: string,
  request: Request,
  fallbackPublicPath: string,
  selfPath?: string
) {
  const normalizedSelfPath = selfPath ? `/${selfPath.replace(/^\/+/, "")}` : "";
  const source = imageUrl === normalizedSelfPath ? fallbackPublicPath : imageUrl;
  const dataResponse = dataUrlImageResponse(source);

  if (dataResponse) {
    return dataResponse;
  }

  const fileResponse = await publicImageResponse(source);

  if (fileResponse) {
    return fileResponse;
  }

  if (/^https?:\/\//.test(source)) {
    return Response.redirect(source, 302);
  }

  return Response.redirect(new URL(fallbackPublicPath, request.url), 302);
}
