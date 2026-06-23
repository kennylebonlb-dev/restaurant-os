import {
  defaultPlatformSmsSettings,
  decrementPlatformSmsCredits,
  getPlatformBrand,
  getPlatformSmsSettings,
  type PlatformSmsTemplateKey
} from "@/server/platform-settings";

type ReservationSmsData = {
  id: string;
  referenceCode?: string | null;
  restaurant: {
    name: string;
    address: string | null;
  };
  user: {
    email: string;
    name: string | null;
    contactEmail?: string | null;
    phone?: string | null;
  };
  table: {
    label: string;
  } | null;
  date: Date;
  startTime: string;
  endTime: string;
  numberOfGuests: number;
  guestFirstName?: string | null;
  guestLastName?: string | null;
  guestEmail?: string | null;
  guestPhone?: string | null;
};

type WaitlistSmsData = {
  restaurant: {
    name: string;
    address: string | null;
    slug?: string | null;
  };
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  requestedTime: string | null;
  numberOfGuests: number;
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC"
  }).format(date);
}

function replaceTemplateVariables(value: string, variables: Record<string, string | number | null | undefined>) {
  return value.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) =>
    variables[key] === undefined || variables[key] === null ? "" : String(variables[key])
  );
}

function normalizePhoneForSms(phone?: string | null) {
  if (!phone) {
    return undefined;
  }

  const compact = phone.replace(/[^\d+]/g, "");

  if (!compact) {
    return undefined;
  }

  if (compact.startsWith("+")) {
    return compact.replace(/[^\d]/g, "");
  }

  if (compact.startsWith("00")) {
    return compact.slice(2);
  }

  if (compact.startsWith("0")) {
    return `33${compact.slice(1)}`;
  }

  return compact;
}

function reservationTemplateVariables(reservation: ReservationSmsData, siteName: string) {
  const guestName = [reservation.guestFirstName, reservation.guestLastName].filter(Boolean).join(" ");
  const customerName =
    guestName ||
    reservation.user.name ||
    [reservation.guestEmail, reservation.user.contactEmail, reservation.user.email].filter(Boolean)[0] ||
    "Bonjour";

  return {
    siteName,
    customerName,
    restaurantName: reservation.restaurant.name,
    restaurantAddress: reservation.restaurant.address ?? "",
    reservationDate: formatDate(reservation.date),
    reservationTime: reservation.startTime,
    reservationEndTime: reservation.endTime,
    guests: reservation.numberOfGuests,
    tableLabel: reservation.table?.label ?? "A attribuer",
    reservationReference: reservation.referenceCode ?? "En attente"
  };
}

async function sendBrevoSms(input: { content: string; recipient: string; sender: string; tag: string }) {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    console.error("SMS skipped because BREVO_API_KEY is not configured.", {
      recipient: input.recipient,
      tag: input.tag
    });
    return false;
  }

  try {
    const response = await fetch("https://api.brevo.com/v3/transactionalSMS/sms", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        content: input.content,
        recipient: input.recipient,
        sender: input.sender,
        tag: input.tag,
        type: "transactional",
        unicodeEnabled: true
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Brevo SMS failed.", {
        error: errorText,
        recipient: input.recipient,
        status: response.status,
        tag: input.tag
      });
      return false;
    }

    const payload = await response.json().catch(() => ({}));
    console.info("Brevo SMS sent.", {
      messageId: payload?.messageId,
      recipient: input.recipient,
      tag: input.tag
    });
    return true;
  } catch (error) {
    console.error("Brevo SMS threw an exception.", {
      error,
      recipient: input.recipient,
      tag: input.tag
    });
    return false;
  }
}

async function sendReservationSms(reservation: ReservationSmsData, templateKey: PlatformSmsTemplateKey) {
  const [brand, settings] = await Promise.all([getPlatformBrand(), getPlatformSmsSettings()]);
  const template = settings.templates[templateKey] ?? defaultPlatformSmsSettings.templates[templateKey];

  if (!settings.enabled || !template.enabled) {
    return true;
  }

  if (settings.creditsRemaining <= 0) {
    console.error("SMS skipped because no SMS credits are available.", {
      reservationId: reservation.id,
      templateKey
    });
    return false;
  }

  const recipient = normalizePhoneForSms(reservation.guestPhone ?? reservation.user.phone);

  if (!recipient || recipient.length < 8) {
    console.error("SMS skipped because reservation has no valid phone number.", {
      reservationId: reservation.id,
      templateKey
    });
    return false;
  }

  const variables = reservationTemplateVariables(reservation, brand.siteName);
  const content = replaceTemplateVariables(template.message, variables).trim().slice(0, 480);

  if (!content) {
    return false;
  }

  const sent = await sendBrevoSms({
    content,
    recipient,
    sender: settings.senderName,
    tag: templateKey
  });

  if (sent) {
    await decrementPlatformSmsCredits();
  }

  return sent;
}

export async function sendReservationConfirmationSms(reservation: ReservationSmsData) {
  return sendReservationSms(reservation, "reservationConfirmation");
}

export async function sendReservationCancellationSms(reservation: ReservationSmsData) {
  return sendReservationSms(reservation, "reservationCancellation");
}

export async function sendReservationUpdateSms(reservation: ReservationSmsData) {
  return sendReservationSms(reservation, "reservationUpdate");
}

export async function sendReservationReminderSms(reservation: ReservationSmsData) {
  return sendReservationSms(reservation, "reservationReminder");
}

export async function sendWaitlistTableAvailableSms(entry: WaitlistSmsData) {
  const [brand, settings] = await Promise.all([getPlatformBrand(), getPlatformSmsSettings()]);

  if (!settings.enabled) {
    return true;
  }

  if (settings.creditsRemaining <= 0) {
    console.error("SMS skipped because no SMS credits are available.", {
      waitlistEntry: [entry.firstName, entry.lastName].filter(Boolean).join(" ")
    });
    return false;
  }

  const recipient = normalizePhoneForSms(entry.phone);

  if (!recipient || recipient.length < 8) {
    return false;
  }

  const requestedTime = entry.requestedTime ? ` à ${entry.requestedTime}` : "";
  const baseUrl = entry.restaurant.slug
    ? `https://${entry.restaurant.slug}.toquetop.com`
    : "https://toquetop.com";
  const content = `Bonjour ${entry.firstName || ""}, ${entry.restaurant.name} peut avoir une table disponible${requestedTime} pour ${entry.numberOfGuests} couvert(s). Réservez ici : ${baseUrl}/reservation ${brand.siteName}`.trim().slice(0, 480);
  const sent = await sendBrevoSms({
    content,
    recipient,
    sender: settings.senderName,
    tag: "waitlistTableAvailable"
  });

  if (sent) {
    await decrementPlatformSmsCredits();
  }

  return sent;
}
