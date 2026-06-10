import { Resend } from "resend";

type ReservationEmailData = {
  id: string;
  restaurant: {
    name: string;
    address: string | null;
  };
  user: {
    email: string;
    name: string | null;
  };
  table: {
    label: string;
  } | null;
  date: Date;
  startTime: string;
  endTime: string;
  numberOfGuests: number;
};

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

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
  const from = process.env.EMAIL_FROM || "Restaurant OS <bookings@example.com>";

  if (!resend) {
    console.info("Email skipped because RESEND_API_KEY is not configured.", { to, subject });
    return;
  }

  await resend.emails.send({
    from,
    to,
    subject,
    html
  });
}

export async function sendReservationConfirmation(reservation: ReservationEmailData) {
  await sendEmail(
    reservation.user.email,
    `Reservation confirmed at ${reservation.restaurant.name}`,
    reservationHtml(reservation, "Reservation confirmed")
  );
}

export async function sendReservationCancellation(reservation: ReservationEmailData) {
  await sendEmail(
    reservation.user.email,
    `Reservation cancelled at ${reservation.restaurant.name}`,
    reservationHtml(reservation, "Reservation cancelled")
  );
}
