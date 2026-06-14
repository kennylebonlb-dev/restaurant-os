"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/hooks/use-api";
import type { PlatformBrand } from "@/server/platform-settings";

type BrandResponse = {
  brand: PlatformBrand;
};

export function BrandLogo({
  initialBrand,
  variant = "header"
}: {
  initialBrand: PlatformBrand;
  variant?: "header" | "footer";
}) {
  const brandQuery = useQuery({
    queryKey: ["platform-brand"],
    queryFn: () => apiFetch<BrandResponse>("/api/platform-brand"),
    staleTime: 60_000
  });
  const brand = brandQuery.data?.brand ?? initialBrand;
  const src = variant === "footer" ? brand.footerLogoUrl : brand.logoUrl;
  const height = variant === "footer" ? brand.footerLogoHeight : brand.logoHeight;
  const maxWidth = variant === "footer" ? 220 : 260;

  return (
    <img
      src={src}
      alt={brand.logoAlt}
      className="w-auto object-contain"
      style={{
        height,
        maxWidth
      }}
    />
  );
}
