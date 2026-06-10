import { create } from "zustand";

type RealtimeState = {
  connected: boolean;
  eventCount: number;
  lastEvent?: string;
  lastEventAt?: string;
  setConnected: (connected: boolean) => void;
  recordEvent: (event: string, emittedAt?: string) => void;
};

export const useRealtimeStore = create<RealtimeState>((set) => ({
  connected: false,
  eventCount: 0,
  setConnected: (connected) => set({ connected }),
  recordEvent: (event, emittedAt) =>
    set((state) => ({
      eventCount: state.eventCount + 1,
      lastEvent: event,
      lastEventAt: emittedAt ?? new Date().toISOString()
    }))
}));
