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
}

export type KeyListener = (key: RemoteKey) => void;

export interface RemoteControl {
  addListener(listener: KeyListener): KeyListener;
  removeListener(listener: KeyListener): void;
  emit(key: RemoteKey): void;
}
