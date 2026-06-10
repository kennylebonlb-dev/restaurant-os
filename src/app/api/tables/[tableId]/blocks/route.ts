import { createTableBlockSchema } from "@/lib/validators";
import { requireRole } from "@/server/auth/guards";
import { apiError, created, ok, parseJson } from "@/server/http";
import {
  createTableBlock,
  listTableBlocks
} from "@/server/services/table-block-service";

type Context = {
  params: Promise<{
    tableId: string;
  }>;
};

export async function GET(_: Request, context: Context) {
  try {
    await requireRole(["ADMIN", "STAFF"]);
    const { tableId } = await context.params;
    const blocks = await listTableBlocks(tableId);

    return ok({ blocks });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request, context: Context) {
  try {
    await requireRole(["ADMIN", "STAFF"]);
    const { tableId } = await context.params;
    const data = await parseJson(request, createTableBlockSchema);
    const block = await createTableBlock({
      tableId,
      ...data
    });

    return created({ block });
  } catch (error) {
    return apiError(error);
  }
}
