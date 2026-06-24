export type RestaurantAccessRole = "OWNER" | "MANAGER" | "HOST" | "READ_ONLY";

export type DashboardSection =
  | "dashboard"
  | "guide"
  | "general"
  | "reservations"
  | "crm"
  | "services"
  | "menus"
  | "gallery"
  | "giftCards"
  | "team"
  | "notifications"
  | "integrations"
  | "subscription"
  | "stats";

export type DashboardPermission =
  | "dashboardView"
  | "reservationsView"
  | "reservationsEdit"
  | "crmView"
  | "crmEdit"
  | "menusView"
  | "menusEdit"
  | "giftCardsView"
  | "giftCardsEdit"
  | "settingsView"
  | "settingsEdit"
  | "teamView"
  | "teamEdit"
  | "subscriptionView"
  | "notificationsView"
  | "notificationsEdit"
  | "statsView";

export const dashboardSectionPermissions: Record<DashboardSection, DashboardPermission> = {
  dashboard: "dashboardView",
  guide: "settingsView",
  general: "settingsView",
  reservations: "reservationsView",
  crm: "crmView",
  services: "settingsView",
  menus: "menusView",
  gallery: "settingsView",
  giftCards: "giftCardsView",
  team: "teamView",
  notifications: "notificationsView",
  integrations: "settingsView",
  subscription: "subscriptionView",
  stats: "statsView"
};

const ownerPermissions: DashboardPermission[] = [
  "dashboardView",
  "reservationsView",
  "reservationsEdit",
  "crmView",
  "crmEdit",
  "menusView",
  "menusEdit",
  "giftCardsView",
  "giftCardsEdit",
  "settingsView",
  "settingsEdit",
  "teamView",
  "teamEdit",
  "subscriptionView",
  "notificationsView",
  "notificationsEdit",
  "statsView"
];

export const restaurantRolePermissions: Record<RestaurantAccessRole, Set<DashboardPermission>> = {
  OWNER: new Set(ownerPermissions),
  MANAGER: new Set(ownerPermissions.filter((permission) => permission !== "subscriptionView")),
  HOST: new Set([
    "dashboardView",
    "reservationsView",
    "reservationsEdit",
    "crmView",
    "crmEdit",
    "menusView",
    "giftCardsView",
    "teamView",
    "statsView"
  ]),
  READ_ONLY: new Set([
    "dashboardView",
    "reservationsView",
    "crmView",
    "menusView",
    "giftCardsView",
    "teamView",
    "statsView"
  ])
};

export function hasDashboardPermission(role: RestaurantAccessRole | null | undefined, permission: DashboardPermission) {
  return restaurantRolePermissions[role ?? "READ_ONLY"].has(permission);
}

export function canAccessDashboardSection(role: RestaurantAccessRole | null | undefined, section: DashboardSection) {
  return hasDashboardPermission(role, dashboardSectionPermissions[section]);
}

export function firstAccessibleDashboardSection(role: RestaurantAccessRole | null | undefined) {
  return (Object.keys(dashboardSectionPermissions) as DashboardSection[]).find((section) => canAccessDashboardSection(role, section)) ?? "dashboard";
}
