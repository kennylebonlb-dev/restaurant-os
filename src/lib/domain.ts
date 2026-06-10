export type Role = "CLIENT" | "ADMIN" | "STAFF";
export type TableZone = "INDOOR" | "TERRACE" | "VIP";
export type ReservationStatus = "PENDING" | "CONFIRMED" | "CANCELLED";
export type TableBlockReason = "MAINTENANCE" | "ADMIN" | "EVENT";

export type OpeningHours = Record<
  string,
  {
    open: string;
    close: string;
    closed?: boolean;
  }
>;

export type FloorTable = {
  id: string;
  label: string;
  capacity: number;
  zone: TableZone;
  positionX: number;
  positionY: number;
  rotation: number;
  active: boolean;
};

export type AvailabilityRequest = {
  date: string;
  startTime: string;
  endTime: string;
  numberOfGuests: number;
};
