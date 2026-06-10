import { updateProfileSchema } from "@/lib/validators";
import { requireSession } from "@/server/auth/guards";
import { apiError, ok, parseJson } from "@/server/http";
import { getUserProfile, updateUserProfile } from "@/server/services/profile-service";

export async function GET() {
  try {
    const session = await requireSession();
    const profile = await getUserProfile(session.user.id);

    return ok({ profile });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireSession();
    const data = await parseJson(request, updateProfileSchema);
    const profile = await updateUserProfile(session.user.id, data);

    return ok({ profile });
  } catch (error) {
    return apiError(error);
  }
}
