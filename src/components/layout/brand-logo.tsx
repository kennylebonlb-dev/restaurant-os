"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/hooks/use-api";
import type { PlatformBrand } from "@/server/platform-settings";

type BrandResponse = {
  brand: PlatformBrand;
};

export function BrandLogo({ initialBrand }: { initialBrand: PlatformBrand }) {
  const brandQuery = useQuery({
    queryKey: ["platform-brand"],
    queryFn: () => apiFetch<BrandResponse>("/api/platform-brand"),
    staleTime: 60_000
  });
  const brand = brandQuery.data?.brand ?? initialBrand;

  return (
    <img
      src={brand.logoUrl}
      alt={brand.logoAlt}
      className="h-10 w-auto max-w-[190px] object-contain sm:h-12 sm:max-w-[230px]"
    />
  );
}
