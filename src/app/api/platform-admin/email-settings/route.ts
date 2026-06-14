import { platformEmailSettingsSchema } from "@/lib/validators";
import { apiError, ok, parseJson } from "@/server/http";
import { requirePlatformAdmin } from "@/server/platform-admin-auth";
import { getPlatformEmailSettings, updatePlatformEmailSettings } from "@/server/platform-settings";

export async function GET() {
  try {
    await requirePlatformAdmin();
    return ok({ emailSettings: await getPlatformEmailSettings() });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await requirePlatformAdmin();
    const data = await parseJson(request, platformEmailSettingsSchema);
    return ok({ emailSettings: await updatePlatformEmailSettings(data) });
  } catch (error) {
    return apiError(error);
  }
}

