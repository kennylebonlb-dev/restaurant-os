"use client";

import { useEffect } from "react";
import { io } from "socket.io-client";

export const realtimeEvents = [
  "reservation_created",
  "reservation_updated",
  "reservation_cancelled",
  "table_blocked",
  "table_unblocked",
  "plan_updated",
  "client_updated",
  "waitlist_updated",
  "service_status_updated",
  "restaurant:created",
  "restaurant:updated",
  "restaurant:deleted",
  "layout:updated",
  "reservation:created",
  "reservation:cancelled",
  "reservation:updated",
  "table:created",
  "table:updated",
  "table:deleted",
  "table:blocked",
  "table:unblocked"
] as const;

const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || undefined;

export const socket = io(socketUrl, {
  path: "/api/socket",
  autoConnect: false
});

export function canUseSocketIo() {
  if (typeof window === "undefined") {
    return false;
  }

  const explicitSocketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;

  if (explicitSocketUrl) {
    return true;
  }

  return ["localhost", "127.0.0.1"].includes(window.location.hostname);
}

export function useRestaurantSocket(restaurantId?: string) {
  useEffect(() => {
    if (!restaurantId || !canUseSocketIo()) {
      return;
    }

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit("restaurant:join", restaurantId);

    return () => {
      socket.emit("restaurant:leave", restaurantId);
    };
  }, [restaurantId]);
}
