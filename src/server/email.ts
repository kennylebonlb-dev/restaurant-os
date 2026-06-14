import { Resend } from "resend";
import { getPlatformBrand } from "@/server/platform-settings";

type ReservationEmailData = {
  id: string;
  restaurant: {
    name: string;
    address: string | null;
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
  return new Intl.DateTimeFormat("en", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC"
  }).format(date);
}

function reservationHtml(reservation: ReservationEmailData, title: string) {
  const tableLabel = reservation.table?.label ?? "To be assigned";

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#16201d">
      <h1 style="font-size:22px">${title}</h1>
      <p>Your reservation at <strong>${reservation.restaurant.name}</strong> is listed below.</p>
      <table style="border-collapse:collapse;margin-top:16px">
        <tr><td style="padding:6px 18px 6px 0">Date</td><td><strong>${formatDate(reservation.date)}</strong></td></tr>
        <tr><td style="padding:6px 18px 6px 0">Time</td><td><strong>${reservation.startTime} - ${reservation.endTime}</strong></td></tr>
        <tr><td style="padding:6px 18px 6px 0">Guests</td><td><strong>${reservation.numberOfGuests}</strong></td></tr>
        <tr><td style="padding:6px 18px 6px 0">Table</td><td><strong>${tableLabel}</strong></td></tr>
        <tr><td style="padding:6px 18px 6px 0">Reference</td><td><strong>${reservation.id}</strong></td></tr>
      </table>
      ${reservation.restaurant.address ? `<p style="margin-top:18px">${reservation.restaurant.address}</p>` : ""}
    </div>
  `;
}

async function sendEmail(to: string, subject: string, html: string) {
  const from = process.env.EMAIL_FROM || "C’est ma table <bookings@example.com>";
  const emailClient = getResend();

  if (!emailClient) {
    console.info("Email skipped because RESEND_API_KEY is not configured.", { to, subject });
    return;
  }

  await emailClient.emails.send({
    from,
    to,
    subject,
    html
  });
}

export async function sendReservationConfirmation(reservation: ReservationEmailData) {
  await sendEmail(
    reservation.guestEmail ?? reservation.user.contactEmail ?? reservation.user.email,
    `Reservation confirmed at ${reservation.restaurant.name}`,
    reservationHtml(reservation, "Reservation confirmed")
  );
}

export async function sendReservationCancellation(reservation: ReservationEmailData) {
  await sendEmail(
    reservation.guestEmail ?? reservation.user.contactEmail ?? reservation.user.email,
    `Reservation cancelled at ${reservation.restaurant.name}`,
    reservationHtml(reservation, "Reservation cancelled")
  );
}

function registrationHtml(user: RegistrationEmailData, siteName: string, appUrl: string) {
  const displayName = user.firstName || user.name || "Bonjour";
  const loginUrl = `${appUrl.replace(/\/$/, "")}/login`;

  return `
    <div style="margin:0;background:#f7f1e8;padding:32px 16px;font-family:Arial,sans-serif;color:#16201d">
      <div style="margin:0 auto;max-width:560px;border:1px solid rgba(22,32,29,.12);border-radius:8px;background:#ffffff;padding:28px">
        <p style="margin:0 0 12px;color:#14735d;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.04em">${escapeHtml(siteName)}</p>
        <h1 style="margin:0 0 14px;font-size:24px;line-height:1.2;color:#16201d">Inscription confirmée</h1>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.6">Bonjour ${escapeHtml(displayName)},</p>
        <p style="margin:0 0 18px;font-size:15px;line-height:1.6">
          Votre compte a bien été créé. Vous pouvez maintenant réserver une table, suivre vos réservations et annuler une réservation depuis votre espace.
        </p>
        <div style="margin:22px 0">
          <a href="${escapeHtml(loginUrl)}" style="display:inline-block;border-radius:6px;background:#14735d;padding:12px 18px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none">
            Accéder à mon espace
          </a>
        </div>
        <table style="border-collapse:collapse;margin-top:18px;width:100%;font-size:14px">
          <tr>
            <td style="border-top:1px solid rgba(22,32,29,.1);padding:12px 12px 8px 0;color:rgba(22,32,29,.65)">E-mail</td>
            <td style="border-top:1px solid rgba(22,32,29,.1);padding:12px 0 8px"><strong>${escapeHtml(user.email)}</strong></td>
          </tr>
          <tr>
            <td style="padding:8px 12px 8px 0;color:rgba(22,32,29,.65)">Référence compte</td>
            <td style="padding:8px 0"><strong>${escapeHtml(user.id)}</strong></td>
          </tr>
        </table>
        <p style="margin:22px 0 0;font-size:12px;line-height:1.5;color:rgba(22,32,29,.58)">
          Si vous n’êtes pas à l’origine de cette inscription, vous pouvez ignorer cet e-mail.
        </p>
      </div>
    </div>
  `;
}

export async function sendRegistrationConfirmation(user: RegistrationEmailData) {
  const brand = await getPlatformBrand();
  const appUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";

  await sendEmail(
    user.email,
    `Bienvenue chez ${brand.siteName}`,
    registrationHtml(user, brand.siteName, appUrl)
  );
}
