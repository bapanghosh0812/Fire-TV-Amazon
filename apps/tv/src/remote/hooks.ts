import { useEffect, useRef } from 'react';
import { useIsFocused } from '@react-navigation/native';
import RemoteControl from './RemoteControl';
import { RemoteKey } from './keys';
import { pushBackHandler } from './navigation';

/** Listen to raw remote keys while the current screen is on top. */
export function useRemoteKeys(handler: (key: RemoteKey) => void, enabled = true) {
  const isFocused = useIsFocused();
  const ref = useRef(handler);
  ref.current = handler;

  useEffect(() => {
    if (!enabled || !isFocused) return;
    const listener = RemoteControl.addListener((key) => ref.current(key));
    return () => RemoteControl.removeListener(listener);
  }, [enabled, isFocused]);
}

/** Intercept the Back button. Return true to consume it. */
export function useBackHandler(handler: () => boolean, enabled = true) {
  const isFocused = useIsFocused();
  const ref = useRef(handler);
  ref.current = handler;

  useEffect(() => {
    if (!enabled || !isFocused) return;
    return pushBackHandler(() => ref.current());
  }, [enabled, isFocused]);
}
