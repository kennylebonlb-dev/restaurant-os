import { platformAdminLoginSchema } from "@/lib/validators";
import {
  createPlatformAdminToken,
  setPlatformAdminCookie,
  validatePlatformAdminCredentials
} from "@/server/platform-admin-auth";
import { apiError, ok, parseJson } from "@/server/http";

export async function POST(request: Request) {
  try {
    const data = await parseJson(request, platformAdminLoginSchema);

    if (!validatePlatformAdminCredentials(data.username, data.password)) {
      const error = new Error("Identifiants incorrects.") as Error & { status?: number };
      error.status = 401;
      throw error;
    }

    await setPlatformAdminCookie(createPlatformAdminToken());

    return ok({ authenticated: true });
  } catch (error) {
    return apiError(error);
  }
}
