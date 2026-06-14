import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { inferTimeZoneFromAddress } from "@/lib/time";
import { updateManagedRestaurantSchema } from "@/lib/validators";
import { NotFoundError } from "@/server/errors";
import { apiError, noContent, ok, parseJson } from "@/server/http";
import { requirePlatformAdmin } from "@/server/platform-admin-auth";

type Context = {
  params: Promise<{
    restaurantId: string;
  }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

const restaurantSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  address: true,
  phone: true,
  timezone: true,
  settings: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      tables: true,
      reservations: true
    }
  }
} satisfies Prisma.RestaurantSelect;

export async function PATCH(request: Request, context: Context) {
  try {
    await requirePlatformAdmin();
    const { restaurantId } = await context.params;
    const data = await parseJson(request, updateManagedRestaurantSchema);
    const existing = await prisma.restaurant.findUnique({
      where: {
        id: restaurantId
      },
      select: {
        settings: true
      }
    });

    if (!existing) {
      throw new NotFoundError("Restaurant not found.");
    }

    const currentSettings = isRecord(existing.settings) ? existing.settings : {};
    const currentSubscription = isRecord(currentSettings.subscription)
      ? currentSettings.subscription
      : {};
    const currentOwner = isRecord(currentSettings.owner) ? currentSettings.owner : {};
    const currentBilling = isRecord(currentSettings.billing) ? currentSettings.billing : {};
    const settings = {
      ...currentSettings,
      ownerEmail: data.ownerEmail ?? currentSettings.ownerEmail ?? "",
      owner: {
        ...currentOwner,
        firstName: data.ownerFirstName ?? currentOwner.firstName ?? "",
        lastName: data.ownerLastName ?? currentOwner.lastName ?? "",
        email: data.ownerEmail ?? currentSettings.ownerEmail ?? currentOwner.email ?? "",
        phone: data.ownerPhone ?? currentOwner.phone ?? "",
        address: data.ownerAddress ?? currentOwner.address ?? ""
      },
      subscription: {
        ...currentSubscription,
        plan: data.subscriptionPlan ?? currentSubscription.plan ?? "Essentiel",
        status: data.subscriptionStatus ?? currentSubscription.status ?? "TRIAL",
        billing: data.subscriptionBilling ?? currentSubscription.billing ?? "MONTHLY",
        amount: data.subscriptionAmount ?? currentSubscription.amount ?? "",
        nextBillingDate:
          data.subscriptionNextBillingDate ?? currentSubscription.nextBillingDate ?? ""
      },
      billing: {
        ...currentBilling,
        status: data.billingStatus ?? currentBilling.status ?? "PENDING",
        paidUntil: data.billingPaidUntil ?? currentBilling.paidUntil ?? "",
        lastPaymentDate: data.billingLastPaymentDate ?? currentBilling.lastPaymentDate ?? "",
        notes: data.billingNotes ?? currentBilling.notes ?? ""
      },
      platformUsers: data.platformUsers ?? currentSettings.platformUsers ?? []
    };

    const restaurant = await prisma.restaurant.update({
      where: {
        id: restaurantId
      },
      data: {
        name: data.name,
        description: data.description,
        address: data.address,
        phone: data.phone,
        timezone: data.address ? inferTimeZoneFromAddress(data.address) : undefined,
        settings: settings as Prisma.InputJsonValue
      },
      select: restaurantSelect
    });

    return ok({ restaurant });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_: Request, context: Context) {
  try {
    await requirePlatformAdmin();
    const { restaurantId } = await context.params;

    await prisma.restaurant.delete({
      where: {
        id: restaurantId
      }
    });

    return noContent();
  } catch (error) {
    return apiError(error);
  }
}
