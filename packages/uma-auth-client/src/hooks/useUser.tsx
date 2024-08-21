import { create } from "zustand";

interface UserState {
  uma?: string;
  setUma: (uma: string) => void;
}

export const useUser = create<UserState>((set) => ({
  setUma: (uma) => set({ uma }),
}));
