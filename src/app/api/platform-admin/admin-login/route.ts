import { platformAdminLoginSettingsSchema } from "@/lib/validators";
import { apiError, ok, parseJson } from "@/server/http";
import { requirePlatformAdmin } from "@/server/platform-admin-auth";
import { getPlatformAdminLoginSettings, updatePlatformAdminLoginSettings } from "@/server/platform-settings";

export async function GET() {
  try {
    await requirePlatformAdmin();
    return ok({ adminLogin: await getPlatformAdminLoginSettings() });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await requirePlatformAdmin();
    const data = await parseJson(request, platformAdminLoginSettingsSchema);
    return ok({ adminLogin: await updatePlatformAdminLoginSettings(data) });
  } catch (error) {
    return apiError(error);
  }
}
