import { platformLandingSchema } from "@/lib/validators";
import { apiError, ok, parseJson } from "@/server/http";
import { requirePlatformAdmin } from "@/server/platform-admin-auth";
import { getPlatformLandingSettings, updatePlatformLandingSettings } from "@/server/platform-settings";

export async function GET() {
  try {
    await requirePlatformAdmin();
    return ok({ landing: await getPlatformLandingSettings() });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await requirePlatformAdmin();
    const data = await parseJson(request, platformLandingSchema);
    return ok({ landing: await updatePlatformLandingSettings(data) });
  } catch (error) {
    return apiError(error);
  }
}
