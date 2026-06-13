import { platformBrandSchema } from "@/lib/validators";
import { apiError, ok, parseJson } from "@/server/http";
import { requirePlatformAdmin } from "@/server/platform-admin-auth";
import { getPlatformBrand, updatePlatformBrand } from "@/server/platform-settings";

export async function GET() {
  try {
    await requirePlatformAdmin();
    return ok({ brand: await getPlatformBrand() });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await requirePlatformAdmin();
    const data = await parseJson(request, platformBrandSchema);
    const brand = await updatePlatformBrand({
      ...data,
      supportEmail: data.supportEmail || ""
    });

    return ok({ brand });
  } catch (error) {
    return apiError(error);
  }
}
