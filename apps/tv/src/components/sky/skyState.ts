import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { create } from 'zustand';
import { resolvePhase, type SkyPhase } from './phases';
import { useSettings } from '../../state/settings';

export type Scrim = 'none' | 'left' | 'center' | 'top' | 'bottom';

interface SkyState {
  scrim: Scrim;
  hidden: boolean; // e.g. while a story plays full screen, so the video decoder can rest
  set: (patch: Partial<Pick<SkyState, 'scrim' | 'hidden'>>) => void;
}

export const useSkyState = create<SkyState>((set) => ({ scrim: 'center', hidden: false, set: (patch) => set(patch) }));

/** Screens call this to say how much the sky should be dimmed behind their content. */
export function useSky(scrim: Scrim, hidden = false) {
  useFocusEffect(
    useCallback(() => {
      useSkyState.getState().set({ scrim, hidden });
    }, [scrim, hidden]),
  );
}

/** Current sky phase: follows the real sun for the TV's time zone, re-checked every minute. */
export function useSkyPhase(): SkyPhase {
  const mode = useSettings((s) => s.skyMode);
  const [phase, setPhase] = useState<SkyPhase>(() => resolvePhase(mode));
  useEffect(() => {
    setPhase(resolvePhase(mode));
    const id = setInterval(() => setPhase(resolvePhase(mode)), 60_000);
    return () => clearInterval(id);
  }, [mode]);
  return phase;
}
