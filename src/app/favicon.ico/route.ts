import { readFile } from "fs/promises";
import path from "path";
import { defaultPlatformBrand, getPlatformBrand } from "@/server/platform-settings";

export const dynamic = "force-dynamic";

const contentTypes: Record<string, string> = {
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};

function dataUrlResponse(dataUrl: string) {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl);

  if (!match) {
    return null;
  }

  return new Response(Buffer.from(match[2], "base64"), {
    headers: {
      "Cache-Control": "public, max-age=300",
      "Content-Type": match[1]
    }
  });
}

async function publicFileResponse(fileUrl: string) {
  if (!fileUrl.startsWith("/") || fileUrl.startsWith("//")) {
    return null;
  }

  const safePath = path.normalize(fileUrl).replace(/^(\.\.[/\\])+/, "");
  const publicPath = path.join(process.cwd(), "public", safePath);
  const publicRoot = path.join(process.cwd(), "public");

  if (!publicPath.startsWith(publicRoot)) {
    return null;
  }

  try {
    const file = await readFile(publicPath);
    const extension = path.extname(publicPath).toLowerCase();

    return new Response(file, {
      headers: {
        "Cache-Control": "public, max-age=300",
        "Content-Type": contentTypes[extension] ?? "image/png"
      }
    });
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const brand = await getPlatformBrand().catch(() => defaultPlatformBrand);
  const dataResponse = dataUrlResponse(brand.faviconUrl);

  if (dataResponse) {
    return dataResponse;
  }

  const fileResponse = await publicFileResponse(brand.faviconUrl);

  if (fileResponse) {
    return fileResponse;
  }

  return Response.redirect(new URL(brand.faviconUrl, request.url), 302);
}
