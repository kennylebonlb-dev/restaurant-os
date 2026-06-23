import { headers } from "next/headers";
import { AdminLoginClient } from "@/components/dashboard/admin-login-client";
import { listRestaurants } from "@/server/services/restaurant-service";
import { defaultPlatformAdminLoginSettings, defaultPlatformBrand, getPlatformAdminLoginSettings } from "@/server/platform-settings";

const adminLoginBrand = {
  ...defaultPlatformBrand,
  logoUrl: "/toquetop-logo.svg",
  marketingLogoUrl: "/toquetop-logo.svg",
  loginVisualUrl: "",
  adminLoginVisualUrl: "/admin-login-visual"
};

const rootHosts = new Set(["toquetop.com", "www.toquetop.com", "localhost", "127.0.0.1"]);
const ignoredSubdomains = new Set(["www", "app", "admin", "api"]);

function restaurantSlugFromHost(host: string) {
  const normalizedHost = host.split(":")[0]?.toLowerCase() ?? "";

  if (rootHosts.has(normalizedHost) || !normalizedHost.endsWith(".toquetop.com")) {
    return "";
  }

  const slug = normalizedHost.replace(/\.toquetop\.com$/, "");
  return slug && !ignoredSubdomains.has(slug) ? slug : "";
}

export default async function AdminLoginPage() {
  const requestHeaders = await headers();
  const slug = restaurantSlugFromHost(requestHeaders.get("host") ?? "");
  const [adminLogin, restaurants] = await Promise.all([
    getPlatformAdminLoginSettings().catch(() => defaultPlatformAdminLoginSettings),
    slug ? listRestaurants({ slug }).catch(() => []) : Promise.resolve([])
  ]);
  const restaurantName = restaurants[0]?.name;

  return (
    <AdminLoginClient
      initialAdminLogin={adminLogin}
      initialBrand={adminLoginBrand}
      initialRestaurantName={restaurantName}
    />
  );
}
