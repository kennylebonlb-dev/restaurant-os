import { ok } from "@/server/http";
import { getPlatformAdminLoginSettings } from "@/server/platform-settings";

export async function GET() {
  return ok({ adminLogin: await getPlatformAdminLoginSettings() });
}
