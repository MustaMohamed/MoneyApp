import { create } from 'zustand'
import type { SecurityChoice } from '@/store/onboarding_store'

interface SecurityStore {
  selected: SecurityChoice | null
  setSelected: (choice: SecurityChoice) => void
  reset: () => void
}

export const useSecurityStore = create<SecurityStore>((set) => ({
  selected: null,
  setSelected: (choice) => set({ selected: choice }),
  reset: () => set({ selected: null }),
}))
