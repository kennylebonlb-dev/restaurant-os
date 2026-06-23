"use client";

import { useQuery } from "@tanstack/react-query";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { LogIn, LogOut, Settings, UserRound } from "lucide-react";
import { apiFetch } from "@/hooks/use-api";
import { useI18n } from "@/lib/i18n";

export function TopNav() {
  const { data: session, status } = useSession();
  const restaurantAccessQuery = useQuery({
    queryKey: ["current-restaurants-nav", session?.user.id],
    enabled: status === "authenticated",
    queryFn: () => apiFetch<{ restaurants: Array<{ id: string }> }>("/api/restaurants/current"),
    retry: false,
    staleTime: 60_000
  });
  const hasRestaurantDashboard = (restaurantAccessQuery.data?.restaurants.length ?? 0) > 0;
  const isAdmin = session?.user.role === "ADMIN" || session?.user.role === "STAFF" || hasRestaurantDashboard;
  const { t } = useI18n();

  return (
    <nav className="flex items-center gap-2">
      <Link className="secondary-button hidden sm:inline-flex" href="/my-reservations">
        <UserRound className="h-4 w-4" />
        {t("nav.reservations")}
      </Link>
      {isAdmin ? (
        <Link className="secondary-button" href="https://www.toquetop.com/admin">
          <Settings className="h-4 w-4" />
          {t("nav.admin")}
        </Link>
      ) : null}
      {status === "authenticated" ? (
        <button className="icon-button" title={t("nav.signOut")} type="button" onClick={() => signOut()}>
          <LogOut className="h-4 w-4" />
        </button>
      ) : (
        <Link className="primary-button" href="/login">
          <LogIn className="h-4 w-4" />
          {t("nav.signIn")}
        </Link>
      )}
    </nav>
  );
}
