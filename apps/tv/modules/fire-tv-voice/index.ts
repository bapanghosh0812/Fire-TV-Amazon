import { requireOptionalNativeModule, type EventSubscription } from 'expo-modules-core';

export type VoiceCommand = 'play' | 'pause' | 'next' | 'previous' | 'seekTo';

export interface SessionState {
  title: string;
  subtitle?: string;
  playing: boolean;
  positionMs?: number;
  durationMs?: number;
  canNext?: boolean;
  canPrevious?: boolean;
}

interface NativeModule {
  activate(state: SessionState): void;
  update(state: SessionState): void;
  deactivate(): void;
  addListener(event: 'onCommand', cb: (e: { command: VoiceCommand; positionMs: number }) => void): EventSubscription;
}

// Android/Fire OS only; everywhere else these calls are safe no-ops.
const native = requireOptionalNativeModule<NativeModule>('FireTvVoice');

export const isAvailable = !!native;

export function activate(state: SessionState) {
  native?.activate({ subtitle: '', positionMs: 0, durationMs: 0, canNext: true, canPrevious: true, ...state });
}

export function update(state: SessionState) {
  native?.update({ subtitle: '', positionMs: 0, durationMs: 0, canNext: true, canPrevious: true, ...state });
}

export function deactivate() {
  native?.deactivate();
}

export function addCommandListener(cb: (command: VoiceCommand, positionMs: number) => void) {
  const sub = native?.addListener('onCommand', (e) => cb(e.command, e.positionMs));
  return () => sub?.remove();
}
