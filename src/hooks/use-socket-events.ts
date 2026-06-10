"use client";

import { useEffect } from "react";
import { io } from "socket.io-client";

export const realtimeEvents = [
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

export const socket = io({
  path: "/api/socket",
  autoConnect: false
});

export function useRestaurantSocket(restaurantId?: string) {
  useEffect(() => {
    if (!restaurantId) {
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
