import { ok } from "@/server/http";
import { clearPlatformAdminCookie } from "@/server/platform-admin-auth";

export async function POST() {
  await clearPlatformAdminCookie();
  return ok({ authenticated: false });
}
