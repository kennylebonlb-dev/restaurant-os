import { create } from "zustand";

type BookingState = {
  date: string;
  startTime: string;
  endTime: string;
  numberOfGuests: number;
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
  endTime: "21:00",
  numberOfGuests: 2,
  selectedTableId: undefined,
  setBookingField: (key, value) => set({ [key]: value }),
  resetTable: () => set({ selectedTableId: undefined })
}));
