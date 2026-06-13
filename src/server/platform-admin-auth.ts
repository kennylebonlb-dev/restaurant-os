import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "cmt_platform_admin";
const SESSION_DURATION_SECONDS = 60 * 60 * 8;

function getPlatformAdminUsername() {
  return process.env.PLATFORM_ADMIN_USERNAME || "admincestmatable";
}

function getPlatformAdminPassword() {
  return process.env.PLATFORM_ADMIN_PASSWORD || "password123";
}

function getPlatformAdminSecret() {
  return process.env.PLATFORM_ADMIN_SECRET || process.env.NEXTAUTH_SECRET || "cest-ma-table-platform-admin-secret";
}

function signPayload(payload: string) {
  return createHmac("sha256", getPlatformAdminSecret()).update(payload).digest("hex");
}

function safeCompare(first: string, second: string) {
  const firstBuffer = Buffer.from(first);
  const secondBuffer = Buffer.from(second);

  if (firstBuffer.length !== secondBuffer.length) {
    return false;
  }

  return timingSafeEqual(firstBuffer, secondBuffer);
}

export function validatePlatformAdminCredentials(username: string, password: string) {
  return safeCompare(username, getPlatformAdminUsername()) && safeCompare(password, getPlatformAdminPassword());
}

export function createPlatformAdminToken() {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS;
  const payload = `${getPlatformAdminUsername()}.${expiresAt}`;
  return `${payload}.${signPayload(payload)}`;
}

export function verifyPlatformAdminToken(token?: string) {
  if (!token) {
    return false;
  }

  const [username, expiresAt, signature] = token.split(".");

  if (!username || !expiresAt || !signature) {
    return false;
  }

  const payload = `${username}.${expiresAt}`;
  const expectedSignature = signPayload(payload);

  if (!safeCompare(signature, expectedSignature)) {
    return false;
  }

  if (username !== getPlatformAdminUsername()) {
    return false;
  }

  return Number(expiresAt) > Math.floor(Date.now() / 1000);
}

export async function getPlatformAdminSession() {
  const cookieStore = await cookies();
  return verifyPlatformAdminToken(cookieStore.get(COOKIE_NAME)?.value);
}

export async function requirePlatformAdmin() {
  const authenticated = await getPlatformAdminSession();

  if (!authenticated) {
    const error = new Error("Platform admin authentication is required.") as Error & { status?: number };
    error.status = 401;
    throw error;
  }
}

export async function setPlatformAdminCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    maxAge: SESSION_DURATION_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });
}

export async function clearPlatformAdminCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
