import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { JournalEntry } from '../types';

interface JournalState {
  entries: JournalEntry[];
  _h: boolean;
  add: (e: JournalEntry) => void;
  update: (e: JournalEntry) => void;
  remove: (id: string) => void;
  clear: () => void;
}

export const useJournalStore = create<JournalState>()(
  persist(
    (set) => ({
      entries: [],
      _h: false,
      add: (e) => set((s) => ({ entries: [e, ...s.entries] })),
      update: (e) => set((s) => ({ entries: s.entries.map((x) => (x.id === e.id ? e : x)) })),
      remove: (id) => set((s) => ({ entries: s.entries.filter((x) => x.id !== id) })),
      clear: () => set({ entries: [] }),
    }),
    {
      name: 'gym-journal',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => () => {
        useJournalStore.setState({ _h: true });
      },
    },
  ),
);
