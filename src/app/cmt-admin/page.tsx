import { redirect } from "next/navigation";
import { PlatformAdminDashboard } from "@/components/platform-admin/platform-admin-dashboard";
import { getPlatformAdminSession } from "@/server/platform-admin-auth";

export default async function CmtAdminPage() {
  const authenticated = await getPlatformAdminSession();

  if (!authenticated) {
    redirect("/cmt-admin/login");
  }

  return <PlatformAdminDashboard />;
}
