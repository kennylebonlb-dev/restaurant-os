import { ok } from "@/server/http";
import { getPlatformAdminSession } from "@/server/platform-admin-auth";

export async function GET() {
  return ok({ authenticated: await getPlatformAdminSession() });
}
