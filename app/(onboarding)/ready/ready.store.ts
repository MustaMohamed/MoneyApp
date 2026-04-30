import { create } from 'zustand'

interface ReadyStore {
  completing: boolean
  setCompleting: (completing: boolean) => void
  reset: () => void
}

export const useReadyStore = create<ReadyStore>((set) => ({
  completing: false,
  setCompleting: (completing) => set({ completing }),
  reset: () => set({ completing: false }),
}))
