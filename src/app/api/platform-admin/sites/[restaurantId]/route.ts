import type { Prisma, RestaurantStaffRole } from "@prisma/client";
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

type PlatformUserRole = "OWNER" | "MANAGER" | "FLOOR_MANAGER" | "WAITER";

function restaurantRoleFromPlatformRole(role: PlatformUserRole): RestaurantStaffRole {
  if (role === "OWNER") {
    return "OWNER";
  }

  if (role === "MANAGER") {
    return "MANAGER";
  }

  return "HOST";
}

async function findOrCreateAccessUser(input: {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}) {
  const email = input.email.trim().toLowerCase();

  if (!email) {
    return null;
  }

  const name = [input.firstName, input.lastName].filter(Boolean).join(" ").trim() || email;

  return prisma.user.upsert({
    where: {
      email
    },
    update: {
      name,
      firstName: input.firstName || undefined,
      lastName: input.lastName || undefined,
      contactEmail: email,
      phone: input.phone || undefined
    },
    create: {
      email,
      name,
      firstName: input.firstName || null,
      lastName: input.lastName || null,
      contactEmail: email,
      phone: input.phone || null,
      role: "CLIENT"
    },
    select: {
      id: true
    }
  });
}

async function grantRestaurantAccess(input: {
  restaurantId: string;
  userId: string;
  role: RestaurantStaffRole;
}) {
  await prisma.restaurantUser.upsert({
    where: {
      restaurantId_userId: {
        restaurantId: input.restaurantId,
        userId: input.userId
      }
    },
    update: {
      role: input.role
    },
    create: {
      restaurantId: input.restaurantId,
      userId: input.userId,
      role: input.role
    }
  });
}

async function syncPlatformRestaurantUsers(
  restaurantId: string,
  users: Array<{
    role: PlatformUserRole;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  }> = []
) {
  for (const userInput of users) {
    const email = userInput.email;

    if (!email) {
      continue;
    }

    const user = await findOrCreateAccessUser({
      ...userInput,
      email
    });

    if (user) {
      await grantRestaurantAccess({
        restaurantId,
        userId: user.id,
        role: restaurantRoleFromPlatformRole(userInput.role)
      });
    }
  }
}

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
    const currentSmsService = isRecord(currentSettings.smsService) ? currentSettings.smsService : {};
    const ownerEmail = String(data.ownerEmail ?? currentSettings.ownerEmail ?? currentOwner.email ?? "")
      .trim()
      .toLowerCase();
    const owner = ownerEmail
      ? await findOrCreateAccessUser({
          email: ownerEmail,
          firstName: data.ownerFirstName ?? String(currentOwner.firstName ?? ""),
          lastName: data.ownerLastName ?? String(currentOwner.lastName ?? ""),
          phone: data.ownerPhone ?? String(currentOwner.phone ?? "")
        })
      : null;
    const settings = {
      ...currentSettings,
      ownerEmail,
      owner: {
        ...currentOwner,
        firstName: data.ownerFirstName ?? currentOwner.firstName ?? "",
        lastName: data.ownerLastName ?? currentOwner.lastName ?? "",
        email: ownerEmail,
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
      smsService: {
        ...currentSmsService,
        enabled: data.smsServiceEnabled ?? currentSmsService.enabled ?? false,
        creditsRemaining: data.smsCreditsRemaining ?? currentSmsService.creditsRemaining ?? 0,
        sentCount: data.smsSentCount ?? currentSmsService.sentCount ?? 0,
        lowCreditThreshold: data.smsLowCreditThreshold ?? currentSmsService.lowCreditThreshold ?? 10,
        priceCents: data.smsPriceCents ?? currentSmsService.priceCents ?? 12
      },
      smsBalance: data.smsCreditsRemaining ?? currentSettings.smsBalance ?? currentSettings.smsRemaining ?? 0,
      smsSentCount: data.smsSentCount ?? currentSettings.smsSentCount ?? currentSettings.smsSent ?? 0,
      smsPriceCents: data.smsPriceCents ?? currentSettings.smsPriceCents ?? 12,
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
        ownerId: owner?.id,
        timezone: data.address ? inferTimeZoneFromAddress(data.address) : undefined,
        settings: settings as Prisma.InputJsonValue
      },
      select: restaurantSelect
    });

    if (owner) {
      await grantRestaurantAccess({
        restaurantId,
        userId: owner.id,
        role: "OWNER"
      });
    }

    await syncPlatformRestaurantUsers(restaurantId, data.platformUsers ?? []);

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
