import { Resend, type Attachment } from "resend";
import {
  defaultPlatformEmailSettings,
  getPlatformBrand,
  getPlatformEmailSettings,
  type PlatformEmailTemplateKey
} from "@/server/platform-settings";

type ReservationEmailData = {
  id: string;
  referenceCode?: string | null;
  restaurant: {
    name: string;
    address: string | null;
    slug?: string | null;
  };
  user: {
    email: string;
    name: string | null;
    contactEmail?: string | null;
  };
  table: {
    label: string;
  } | null;
  date: Date;
  startTime: string;
  endTime: string;
  numberOfGuests: number;
  guestEmail?: string | null;
};

type RegistrationEmailData = {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
};

type PasswordResetEmailData = {
  email: string;
  name: string | null;
  firstName: string | null;
  resetUrl: string;
  expiresAt: Date;
};

type WaitlistEmailData = {
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

let resend: Resend | null | undefined;

function getResend() {
  if (resend !== undefined) {
    return resend;
  }

  resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  return resend;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC"
  }).format(date);
}

function nl2br(value: string) {
  return escapeHtml(value).replace(/\n/g, "<br />");
}

function replaceTemplateVariables(value: string, variables: Record<string, string | number | null | undefined>) {
  return value.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) =>
    variables[key] === undefined || variables[key] === null ? "" : String(variables[key])
  );
}

function mimeExtension(mimeType: string) {
  if (mimeType === "image/jpeg") {
    return "jpg";
  }

  return mimeType.split("/")[1]?.replace(/[^a-z0-9]/gi, "") || "png";
}

function dataImageAttachment(dataUrl: string): { src: string; attachments: Attachment[] } | null {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl);

  if (!match) {
    return null;
  }

  const inlineContentId = "toquetop-email-logo";
  const contentType = match[1];
  const content = Buffer.from(match[2], "base64");

  return {
    src: `cid:${inlineContentId}`,
    attachments: [
      {
        content,
        contentType,
        filename: `logo-email.${mimeExtension(contentType)}`,
        inlineContentId
      }
    ]
  };
}

function toEmailLogo(urls: string[]): { attachments: Attachment[]; src: string } {
  const appUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || "https://toquetop.com";
  const usableUrl = urls.find(Boolean) ?? defaultPlatformEmailSettings.logoUrl;

  if (usableUrl.startsWith("data:image/")) {
    return dataImageAttachment(usableUrl) ?? toEmailLogo([defaultPlatformEmailSettings.logoUrl]);
  }

  if (/^https?:\/\//.test(usableUrl)) {
    return {
      src: usableUrl,
      attachments: []
    };
  }

  return {
    src: `${appUrl.replace(/\/$/, "")}${usableUrl.startsWith("/") ? usableUrl : `/${usableUrl}`}`,
    attachments: []
  };
}

async function renderEmailTemplate(
  templateKey: PlatformEmailTemplateKey,
  variables: Record<string, string | number | null | undefined>,
  buttonHref?: string
) {
  const [brand, settings] = await Promise.all([getPlatformBrand(), getPlatformEmailSettings()]);
  const template = settings.templates[templateKey] ?? defaultPlatformEmailSettings.templates[templateKey];
  const mergedVariables = {
    siteName: brand.siteName,
    ...variables
  };
  const subject = replaceTemplateVariables(template.subject, mergedVariables);
  const title = replaceTemplateVariables(template.title, mergedVariables);
  const body = replaceTemplateVariables(template.body, mergedVariables);
  const footerText = replaceTemplateVariables(template.footerText, mergedVariables);
  const preheader = replaceTemplateVariables(template.preheader, mergedVariables);
  const buttonLabel = replaceTemplateVariables(template.buttonLabel, mergedVariables);
  const logo = toEmailLogo([settings.logoUrl, brand.logoUrl, defaultPlatformEmailSettings.logoUrl]);

  return {
    enabled: template.enabled,
    subject,
    fromName: settings.senderName,
    replyTo: settings.replyTo,
    attachments: logo.attachments,
    html: `
    <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</div>
    <div style="margin:0;background:${settings.backgroundColor};padding:32px 16px;font-family:Arial,sans-serif;color:${settings.textColor}">
      <div style="margin:0 auto;max-width:560px;border:1px solid rgba(22,32,29,.12);border-radius:${settings.borderRadius}px;background:${settings.cardColor};padding:28px">
        <img src="${escapeHtml(logo.src)}" alt="${escapeHtml(brand.logoAlt)}" style="display:block;height:${settings.logoHeight}px;max-width:220px;object-fit:contain;margin:0 0 18px" />
        <h1 style="margin:0 0 14px;font-size:24px;line-height:1.2;color:${settings.textColor}">${escapeHtml(title)}</h1>
        <p style="margin:0 0 18px;font-size:15px;line-height:1.7">${nl2br(body)}</p>
        ${buttonHref && buttonLabel ? `<div style="margin:22px 0 0">
          <a href="${escapeHtml(buttonHref)}" style="display:inline-block;border-radius:6px;background:${settings.accentColor};padding:12px 18px;color:${settings.buttonTextColor};font-size:14px;font-weight:700;text-decoration:none">
            ${escapeHtml(buttonLabel)}
          </a>
        </div>` : ""}
        ${footerText ? `<p style="margin:22px 0 0;font-size:12px;line-height:1.5;color:rgba(22,32,29,.58)">${nl2br(footerText)}</p>` : ""}
      </div>
    </div>
  `
  };
}

function reservationTemplateVariables(reservation: ReservationEmailData) {
  const appUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || "https://toquetop.com";
  const restaurantSlug = reservation.restaurant.slug?.trim();
  const restaurantBaseUrl = restaurantSlug
    ? `https://${restaurantSlug}.toquetop.com`
    : appUrl.replace(/\/$/, "");
  const reservationUrl = `${restaurantBaseUrl}/my-reservations`;
  const customerName =
    reservation.user.name ||
    [reservation.guestEmail, reservation.user.email].filter(Boolean)[0] ||
    "Bonjour";

  return {
    customerName,
    restaurantName: reservation.restaurant.name,
    restaurantAddress: reservation.restaurant.address ?? "",
    reservationDate: formatDate(reservation.date),
    reservationTime: reservation.startTime,
    reservationEndTime: reservation.endTime,
    guests: reservation.numberOfGuests,
    tableLabel: reservation.table?.label ?? "À attribuer",
    reservationReference: reservation.referenceCode ?? "En attente",
    reservationUrl
  };
}

function formatFromAddress(name?: string) {
  const configuredFrom = process.env.EMAIL_FROM || "ToqueTop <reservations@toquetop.com>";
  const match = configuredFrom.match(/<([^>]+)>/);

  if (!name || !match?.[1]) {
    return configuredFrom;
  }

  return `${name.replace(/[<>]/g, "").trim()} <${match[1]}>`;
}

async function sendEmail(
  to: string,
  subject: string,
  html: string,
  options?: { attachments?: Attachment[]; fromName?: string; replyTo?: string }
) {
  const from = formatFromAddress(options?.fromName);
  const emailClient = getResend();

  if (!emailClient) {
    console.error("Email skipped because RESEND_API_KEY is not configured.", { to, subject });
    return false;
  }

  try {
    const { data, error } = await emailClient.emails.send({
      from,
      replyTo: options?.replyTo || undefined,
      to,
      subject,
      html,
      attachments: options?.attachments?.length ? options.attachments : undefined
    });

    if (error) {
      console.error("Resend email failed.", {
        error,
        from,
        subject,
        to
      });
      return false;
    }

    console.info("Resend email sent.", {
      emailId: data?.id,
      from,
      subject,
      to
    });
    return true;
  } catch (error) {
    console.error("Resend email threw an exception.", {
      error,
      from,
      subject,
      to
    });
    return false;
  }
}

export async function sendReservationConfirmation(reservation: ReservationEmailData) {
  const variables = reservationTemplateVariables(reservation);
  const rendered = await renderEmailTemplate("reservationConfirmation", variables, String(variables.reservationUrl));

  if (!rendered.enabled) {
    return true;
  }

  return sendEmail(
    reservation.guestEmail ?? reservation.user.contactEmail ?? reservation.user.email,
    rendered.subject,
    rendered.html,
    rendered
  );
}

export async function sendReservationCancellation(reservation: ReservationEmailData) {
  const variables = reservationTemplateVariables(reservation);
  const rendered = await renderEmailTemplate("reservationCancellation", variables, String(variables.reservationUrl));

  if (!rendered.enabled) {
    return true;
  }

  return sendEmail(
    reservation.guestEmail ?? reservation.user.contactEmail ?? reservation.user.email,
    rendered.subject,
    rendered.html,
    rendered
  );
}

export async function sendReservationUpdate(reservation: ReservationEmailData) {
  const variables = reservationTemplateVariables(reservation);
  const rendered = await renderEmailTemplate("reservationUpdate", variables, String(variables.reservationUrl));

  if (!rendered.enabled) {
    return true;
  }

  return sendEmail(
    reservation.guestEmail ?? reservation.user.contactEmail ?? reservation.user.email,
    rendered.subject,
    rendered.html,
    rendered
  );
}

export async function sendReservationReminder(reservation: ReservationEmailData) {
  const variables = reservationTemplateVariables(reservation);
  const rendered = await renderEmailTemplate("reservationReminder", variables, String(variables.reservationUrl));

  if (!rendered.enabled) {
    return true;
  }

  return sendEmail(
    reservation.guestEmail ?? reservation.user.contactEmail ?? reservation.user.email,
    rendered.subject,
    rendered.html,
    rendered
  );
}

export async function sendRegistrationConfirmation(user: RegistrationEmailData) {
  const appUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
  const loginUrl = `${appUrl.replace(/\/$/, "")}/login`;
  const rendered = await renderEmailTemplate(
    "registration",
    {
      customerName: user.firstName || user.name || "Bonjour",
      customerEmail: user.email,
      accountReference: user.id,
      loginUrl
    },
    loginUrl
  );

  if (!rendered.enabled) {
    return true;
  }

  return sendEmail(
    user.email,
    rendered.subject,
    rendered.html,
    rendered
  );
}

export async function sendPasswordResetEmail(user: PasswordResetEmailData) {
  const expiration = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Paris"
  }).format(user.expiresAt);
  const rendered = await renderEmailTemplate(
    "passwordReset",
    {
      customerName: user.firstName || user.name || "Bonjour",
      customerEmail: user.email,
      resetUrl: user.resetUrl,
      expiration
    },
    user.resetUrl
  );

  if (!rendered.enabled) {
    return true;
  }

  return sendEmail(
    user.email,
    rendered.subject,
    rendered.html,
    rendered
  );
}

export async function sendWaitlistTableAvailableEmail(entry: WaitlistEmailData) {
  if (!entry.email) {
    return false;
  }

  const [brand, settings] = await Promise.all([getPlatformBrand(), getPlatformEmailSettings()]);
  const logo = toEmailLogo([settings.logoUrl, brand.logoUrl, defaultPlatformEmailSettings.logoUrl]);
  const customerName = [entry.firstName, entry.lastName].filter(Boolean).join(" ") || "Bonjour";
  const restaurantSlug = entry.restaurant.slug?.trim();
  const restaurantUrl = restaurantSlug
    ? `https://${restaurantSlug}.toquetop.com`
    : (process.env.APP_URL || process.env.NEXTAUTH_URL || "https://toquetop.com").replace(/\/$/, "");
  const reservationUrl = `${restaurantUrl}/reservation`;
  const requestedTime = entry.requestedTime ? ` pour ${entry.requestedTime}` : "";
  const html = `
    <div style="margin:0;background:${settings.backgroundColor};padding:32px 16px;font-family:Arial,sans-serif;color:${settings.textColor}">
      <div style="margin:0 auto;max-width:560px;border:1px solid rgba(22,32,29,.12);border-radius:${settings.borderRadius}px;background:${settings.cardColor};padding:28px">
        <img src="${escapeHtml(logo.src)}" alt="${escapeHtml(brand.logoAlt)}" style="display:block;height:${settings.logoHeight}px;max-width:220px;object-fit:contain;margin:0 0 18px" />
        <h1 style="margin:0 0 14px;font-size:24px;line-height:1.2;color:${settings.textColor}">Une table peut se libérer</h1>
        <p style="margin:0 0 18px;font-size:15px;line-height:1.7">
          Bonjour ${escapeHtml(customerName)},<br />
          ${escapeHtml(entry.restaurant.name)} vient de vous prévenir qu’une table peut se libérer${escapeHtml(requestedTime)} pour ${entry.numberOfGuests} couvert(s).
          Contactez le restaurant rapidement pour confirmer votre venue.
        </p>
        <div style="margin:22px 0 0">
          <a href="${escapeHtml(reservationUrl)}" style="display:inline-block;border-radius:6px;background:${settings.accentColor};padding:12px 18px;color:${settings.buttonTextColor};font-size:14px;font-weight:700;text-decoration:none">
            Je réserve ma table
          </a>
        </div>
        ${entry.restaurant.address ? `<p style="margin:22px 0 0;font-size:12px;line-height:1.5;color:rgba(22,32,29,.58)">${escapeHtml(entry.restaurant.address)}</p>` : ""}
      </div>
    </div>
  `;

  return sendEmail(
    entry.email,
    `Une table peut se libérer chez ${entry.restaurant.name}`,
    html,
    {
      attachments: logo.attachments,
      fromName: settings.senderName,
      replyTo: settings.replyTo
    }
  );
}
