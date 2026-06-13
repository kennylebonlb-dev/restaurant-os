import { getPlatformBrand } from "@/server/platform-settings";

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

export async function GET(request: Request) {
  const brand = await getPlatformBrand();
  const dataResponse = dataUrlResponse(brand.faviconUrl);

  if (dataResponse) {
    return dataResponse;
  }

  return Response.redirect(new URL(brand.faviconUrl, request.url), 302);
}
