import { create } from "zustand";

type FloorPlanState = {
  selectedTableId?: string;
  setSelectedTableId: (tableId?: string) => void;
};

export const useFloorPlanStore = create<FloorPlanState>((set) => ({
  selectedTableId: undefined,
  setSelectedTableId: (tableId) => set({ selectedTableId: tableId })
}));
