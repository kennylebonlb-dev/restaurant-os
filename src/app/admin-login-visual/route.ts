import { platformImageResponse } from "@/server/platform-image-response";
import { defaultPlatformBrand, getPlatformBrand } from "@/server/platform-settings";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const brand = await getPlatformBrand().catch(() => defaultPlatformBrand);
  const visualUrl =
    brand.adminLoginVisualUrl && brand.adminLoginVisualUrl !== brand.loginVisualUrl
      ? brand.adminLoginVisualUrl
      : defaultPlatformBrand.adminLoginVisualUrl;

  return platformImageResponse(visualUrl, request, "/admin-login-visual-default.svg", "/admin-login-visual");
}
