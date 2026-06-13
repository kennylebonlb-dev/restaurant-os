import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type PlatformBrand = {
  siteName: string;
  logoUrl: string;
  faviconUrl: string;
  logoAlt: string;
  supportEmail?: string;
};

const BRAND_KEY = "brand";

export const defaultPlatformBrand: PlatformBrand = {
  siteName: "C’est ma table",
  logoUrl: "/cest-ma-table-logo.png",
  faviconUrl: "/cest-ma-table-favicon.png",
  logoAlt: "C’est ma table",
  supportEmail: ""
};

function normalizePlatformBrand(value: unknown): PlatformBrand {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return defaultPlatformBrand;
  }

  const record = value as Record<string, unknown>;

  return {
    siteName: typeof record.siteName === "string" && record.siteName.trim() ? record.siteName : defaultPlatformBrand.siteName,
    logoUrl: typeof record.logoUrl === "string" && record.logoUrl.trim() ? record.logoUrl : defaultPlatformBrand.logoUrl,
    faviconUrl:
      typeof record.faviconUrl === "string" && record.faviconUrl.trim()
        ? record.faviconUrl
        : defaultPlatformBrand.faviconUrl,
    logoAlt: typeof record.logoAlt === "string" && record.logoAlt.trim() ? record.logoAlt : defaultPlatformBrand.logoAlt,
    supportEmail: typeof record.supportEmail === "string" ? record.supportEmail : ""
  };
}

export async function getPlatformBrand() {
  const setting = await prisma.platformSetting.findUnique({
    where: {
      key: BRAND_KEY
    }
  });

  return normalizePlatformBrand(setting?.value);
}

export async function updatePlatformBrand(brand: PlatformBrand) {
  const setting = await prisma.platformSetting.upsert({
    where: {
      key: BRAND_KEY
    },
    update: {
      value: brand as unknown as Prisma.InputJsonValue
    },
    create: {
      key: BRAND_KEY,
      value: brand as unknown as Prisma.InputJsonValue
    }
  });

  return normalizePlatformBrand(setting.value);
}
