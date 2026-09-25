export enum RemoteKey {
  Up = 'Up',
  Down = 'Down',
  Left = 'Left',
  Right = 'Right',
  Select = 'Select',
  Back = 'Back',
  PlayPause = 'PlayPause',
  FastForward = 'FastForward',
  Rewind = 'Rewind',
  Menu = 'Menu',
  D0 = '0',
  D1 = '1',
  D2 = '2',
  D3 = '3',
  D4 = '4',
  D5 = '5',
  D6 = '6',
  D7 = '7',
  D8 = '8',
  D9 = '9',
  Delete = 'Delete',
}

export const DIGIT_KEYS = [RemoteKey.D0, RemoteKey.D1, RemoteKey.D2, RemoteKey.D3, RemoteKey.D4, RemoteKey.D5, RemoteKey.D6, RemoteKey.D7, RemoteKey.D8, RemoteKey.D9];
export const digitOf = (k: RemoteKey) => (DIGIT_KEYS.indexOf(k) >= 0 ? String(DIGIT_KEYS.indexOf(k)) : null);

export type KeyListener = (key: RemoteKey) => void;

export interface RemoteControl {
  addListener(listener: KeyListener): KeyListener;
  removeListener(listener: KeyListener): void;
  emit(key: RemoteKey): void;
  claimBack(): void;
}
