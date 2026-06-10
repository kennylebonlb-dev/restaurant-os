import { createTableSchema } from "@/lib/validators";
import { requireRole } from "@/server/auth/guards";
import { apiError, created, ok, parseJson } from "@/server/http";
import { createTable, listTables } from "@/server/services/table-service";

type Context = {
  params: Promise<{
    restaurantId: string;
  }>;
};

export async function GET(_: Request, context: Context) {
  try {
    const { restaurantId } = await context.params;
    const tables = await listTables(restaurantId);
    return ok({ tables });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request, context: Context) {
  try {
    await requireRole(["ADMIN"]);
    const { restaurantId } = await context.params;
    const data = await parseJson(request, createTableSchema);
    const table = await createTable({
      restaurantId,
      ...data
    });

    return created({ table });
  } catch (error) {
    return apiError(error);
  }
}
