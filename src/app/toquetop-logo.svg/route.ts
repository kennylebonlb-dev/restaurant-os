import { platformImageResponse } from "@/server/platform-image-response";
import { defaultPlatformBrand, getPlatformBrand } from "@/server/platform-settings";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const brand = await getPlatformBrand().catch(() => defaultPlatformBrand);
  const logoUrl = brand.marketingLogoUrl || brand.logoUrl || defaultPlatformBrand.marketingLogoUrl;

  return platformImageResponse(logoUrl, request, "/toquetop-logo-default.svg", "/toquetop-logo.svg");
}
