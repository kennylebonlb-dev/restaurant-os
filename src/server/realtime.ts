import type { Server } from "socket.io";

type RestaurantEvent =
  | "restaurant:created"
  | "restaurant:updated"
  | "restaurant:deleted"
  | "layout:updated"
  | "reservation:created"
  | "reservation:cancelled"
  | "reservation:updated"
  | "table:created"
  | "table:updated"
  | "table:deleted"
  | "table:blocked"
  | "table:unblocked";

let io: Server | null = null;

export function setRealtimeServer(server: Server) {
  io = server;
}

export function getRealtimeServer() {
  return io;
}

export function emitRestaurantEvent<TPayload>(
  restaurantId: string,
  event: RestaurantEvent,
  payload: TPayload
) {
  io?.to(`restaurant:${restaurantId}`).to("smartable:global").emit(event, {
    restaurantId,
    event,
    payload,
    emittedAt: new Date().toISOString()
  });
}
