import { redirect } from "next/navigation";
import { RestaurantPlanManager } from "@/components/platform-admin/restaurant-plan-manager";
import { getPlatformAdminSession } from "@/server/platform-admin-auth";

type PageProps = {
  params: Promise<{
    restaurantId: string;
  }>;
};

export default async function PlatformRestaurantPlansPage({ params }: PageProps) {
  const authenticated = await getPlatformAdminSession();

  if (!authenticated) {
    redirect("/cmt-admin/login");
  }

  const { restaurantId } = await params;

  return <RestaurantPlanManager restaurantId={restaurantId} />;
}
