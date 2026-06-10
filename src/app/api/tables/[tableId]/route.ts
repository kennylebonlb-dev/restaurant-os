import { updateTableSchema } from "@/lib/validators";
import { requireRole } from "@/server/auth/guards";
import { apiError, noContent, ok, parseJson } from "@/server/http";
import { deleteTable, updateTable } from "@/server/services/table-service";

type Context = {
  params: Promise<{
    tableId: string;
  }>;
};

export async function PATCH(request: Request, context: Context) {
  try {
    await requireRole(["ADMIN"]);
    const { tableId } = await context.params;
    const data = await parseJson(request, updateTableSchema);
    const table = await updateTable(tableId, data);

    return ok({ table });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_: Request, context: Context) {
  try {
    await requireRole(["ADMIN"]);
    const { tableId } = await context.params;
    await deleteTable(tableId);

    return noContent();
  } catch (error) {
    return apiError(error);
  }
}
