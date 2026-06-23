import type { Server } from "socket.io";

type RestaurantEvent =
  | "reservation_created"
  | "reservation_updated"
  | "reservation_cancelled"
  | "table_blocked"
  | "table_unblocked"
  | "plan_updated"
  | "client_updated"
  | "waitlist_updated"
  | "service_status_updated"
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

const mirroredEventNames: Partial<Record<RestaurantEvent, RestaurantEvent>> = {
  "reservation:created": "reservation_created",
  "reservation:updated": "reservation_updated",
  "reservation:cancelled": "reservation_cancelled",
  "table:blocked": "table_blocked",
  "table:unblocked": "table_unblocked",
  "layout:updated": "plan_updated",
  "table:created": "plan_updated",
  "table:updated": "plan_updated",
  "table:deleted": "plan_updated"
};

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
  const message = {
    restaurantId,
    event,
    payload,
    emittedAt: new Date().toISOString()
  };

  io?.to(`restaurant:${restaurantId}`).to("smartable:global").emit(event, message);

  const mirroredEvent = mirroredEventNames[event];

  if (mirroredEvent) {
    io?.to(`restaurant:${restaurantId}`).to("smartable:global").emit(mirroredEvent, {
      ...message,
      event: mirroredEvent
    });
  }
}
