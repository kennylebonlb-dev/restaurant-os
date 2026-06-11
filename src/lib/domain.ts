export type Role = "CLIENT" | "ADMIN" | "STAFF";
export type TableZone = "INDOOR" | "TERRACE" | "VIP";
export type TableShape = "ROUND" | "SQUARE" | "RECTANGLE";
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
  shape?: TableShape;
};

export type DetectedGlbTable = {
  id: string;
  label: string;
  capacity: number;
  zone: TableZone;
  positionX: number;
  positionY: number;
  rotation: number;
  confidence: number;
  sourceName: string;
  scenePosition: {
    x: number;
    y: number;
    z: number;
  };
  sceneSize: {
    width: number;
    depth: number;
  };
};

export type AvailabilityRequest = {
  date: string;
  startTime: string;
  endTime?: string;
  numberOfGuests: number;
};

export type AvailabilitySlot = {
  startTime: string;
  endTime: string;
  availableTables: number;
  totalTables: number;
  selectable: boolean;
  status: "GREEN" | "ORANGE" | "RED" | "CLOSED";
  reason?: "TOO_SOON" | "CLOSED" | "NO_TABLE_CAPACITY" | "FULL";
};
