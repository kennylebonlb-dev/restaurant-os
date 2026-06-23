import { platformImageResponse } from "@/server/platform-image-response";
import { defaultPlatformBrand, getPlatformBrand } from "@/server/platform-settings";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const brand = await getPlatformBrand().catch(() => defaultPlatformBrand);
  const visualUrl = brand.loginVisualUrl || defaultPlatformBrand.loginVisualUrl;

  return platformImageResponse(visualUrl, request, "/login-restaurant-visual.png", "/client-login-visual");
}
