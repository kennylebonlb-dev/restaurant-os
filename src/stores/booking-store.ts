import { create } from "zustand";

type BookingState = {
  date: string;
  startTime: string;
  numberOfGuests: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notes: string;
  autoAssignTable: boolean;
  selectedTableId?: string;
  setBookingField: <TKey extends keyof Omit<BookingState, "setBookingField" | "resetTable">>(
    key: TKey,
    value: BookingState[TKey]
  ) => void;
  resetTable: () => void;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

export const useBookingStore = create<BookingState>((set) => ({
  date: today(),
  startTime: "19:00",
  numberOfGuests: 2,
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  notes: "",
  autoAssignTable: false,
  selectedTableId: undefined,
  setBookingField: (key, value) => set({ [key]: value }),
  resetTable: () => set({ selectedTableId: undefined })
}));
