import { platformSmsSettingsSchema } from "@/lib/validators";
import { apiError, ok, parseJson } from "@/server/http";
import { requirePlatformAdmin } from "@/server/platform-admin-auth";
import { getPlatformSmsSettings, updatePlatformSmsSettings } from "@/server/platform-settings";

export async function GET() {
  try {
    await requirePlatformAdmin();
    return ok({ smsSettings: await getPlatformSmsSettings() });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await requirePlatformAdmin();
    const data = await parseJson(request, platformSmsSettingsSchema);
    return ok({ smsSettings: await updatePlatformSmsSettings(data) });
  } catch (error) {
    return apiError(error);
  }
}
