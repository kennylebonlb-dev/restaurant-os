"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { realtimeEvents, socket } from "@/hooks/use-socket-events";
import { useRealtimeStore } from "@/stores/realtime-store";

type RealtimePayload = {
  restaurantId?: string;
  event?: string;
  emittedAt?: string;
};

const realtimeQueryRoots = new Set([
  "restaurants",
  "restaurant",
  "tables",
  "reservations",
  "analytics",
  "availability",
  "blocks",
  "me"
]);

export function RealtimeBridge() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const setConnected = useRealtimeStore.getState().setConnected;
    const recordEvent = useRealtimeStore.getState().recordEvent;

    if (!socket.connected) {
      socket.connect();
    }

    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    const refresh = (message: RealtimePayload = {}) => {
      recordEvent(message.event ?? "realtime:event", message.emittedAt);
      queryClient.invalidateQueries({
        predicate: (query) => realtimeQueryRoots.has(String(query.queryKey[0]))
      });
    };

    for (const event of realtimeEvents) {
      socket.on(event, refresh);
    }

    setConnected(socket.connected);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);

      for (const event of realtimeEvents) {
        socket.off(event, refresh);
      }
    };
  }, [queryClient]);

  return null;
}
