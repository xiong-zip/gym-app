import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Profile } from '../types';

interface ProfileState {
  profile: Profile | null;
  _h: boolean;
  save: (p: Profile) => void;
  clear: () => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      profile: null,
      _h: false,
      save: (p) => set({ profile: p }),
      clear: () => set({ profile: null }),
    }),
    {
      name: 'gym-profile',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => () => {
        useProfileStore.setState({ _h: true });
      },
    },
  ),
);
