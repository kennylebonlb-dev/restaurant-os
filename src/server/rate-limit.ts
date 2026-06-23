import { TooManyRequestsError } from "@/server/errors";

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function assertRateLimit(key: string, options: { limit: number; windowMs: number }) {
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + options.windowMs
    });
    return;
  }

  if (current.count >= options.limit) {
    throw new TooManyRequestsError("Trop de tentatives. Réessayez dans quelques instants.");
  }

  current.count += 1;
}

export function rateLimitKey(request: Request, scope: string) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip");
  return `${scope}:${forwardedFor || realIp || "unknown"}`;
}
