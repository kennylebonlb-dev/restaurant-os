import { ok } from "@/server/http";
import { getPlatformBrand } from "@/server/platform-settings";

export async function GET() {
  return ok({ brand: await getPlatformBrand() });
}
