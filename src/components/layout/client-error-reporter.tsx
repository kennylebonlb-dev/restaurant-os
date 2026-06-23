"use client";

import { useEffect } from "react";

type ClientErrorPayload = {
  message?: string;
  name?: string;
  source: string;
  stack?: string;
  url?: string;
  userAgent?: string;
};

function toErrorPayload(error: unknown, source: string): ClientErrorPayload {
  const errorLike = error instanceof Error ? error : null;

  return {
    message: errorLike?.message ?? String(error ?? "Unknown client error"),
    name: errorLike?.name,
    source,
    stack: errorLike?.stack,
    url: typeof window !== "undefined" ? window.location.href : undefined,
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined
  };
}

export function reportClientError(error: unknown, source = "client") {
  if (typeof window === "undefined") {
    return;
  }

  const payload = JSON.stringify(toErrorPayload(error, source));

  if (navigator.sendBeacon) {
    const sent = navigator.sendBeacon("/api/client-errors", new Blob([payload], { type: "application/json" }));

    if (sent) {
      return;
    }
  }

  void fetch("/api/client-errors", {
    body: payload,
    headers: {
      "Content-Type": "application/json"
    },
    keepalive: true,
    method: "POST"
  }).catch(() => undefined);
}

export function ClientErrorReporter() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      reportClientError(event.error ?? event.message, "window.error");
    };
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      reportClientError(event.reason, "window.unhandledrejection");
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return null;
}
