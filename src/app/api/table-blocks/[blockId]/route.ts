import { requireRole } from "@/server/auth/guards";
import { apiError, noContent } from "@/server/http";
import { deleteTableBlock } from "@/server/services/table-block-service";

type Context = {
  params: Promise<{
    blockId: string;
  }>;
};

export async function DELETE(_: Request, context: Context) {
  try {
    await requireRole(["ADMIN", "STAFF"]);
    const { blockId } = await context.params;
    await deleteTableBlock(blockId);

    return noContent();
  } catch (error) {
    return apiError(error);
  }
}
