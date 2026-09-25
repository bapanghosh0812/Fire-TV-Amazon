// Web / fallback implementation: keyboard arrows behave like the D-pad.
import mitt from 'mitt';
import { Platform } from 'react-native';
import { KeyListener, RemoteControl, RemoteKey } from './keys';

const KEYS: Record<string, RemoteKey> = {
  ArrowUp: RemoteKey.Up,
  ArrowDown: RemoteKey.Down,
  ArrowLeft: RemoteKey.Left,
  ArrowRight: RemoteKey.Right,
  Enter: RemoteKey.Select,
  NumpadEnter: RemoteKey.Select,
  Backspace: RemoteKey.Back,
  Escape: RemoteKey.Back,
  Space: RemoteKey.PlayPause,
  MediaPlayPause: RemoteKey.PlayPause,
  KeyM: RemoteKey.Menu,
  Delete: RemoteKey.Delete,
};
for (let d = 0; d <= 9; d++) {
  KEYS[`Digit${d}`] = String(d) as RemoteKey;
  KEYS[`Numpad${d}`] = String(d) as RemoteKey;
}

class WebRemote implements RemoteControl {
  private bus = mitt<{ key: RemoteKey }>();

  constructor() {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('keydown', (e) => {
        // Let real text fields keep their keys (typing names and emails).
        const target = e.target as HTMLElement | null;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') && !['ArrowUp', 'ArrowDown', 'Escape', 'Enter'].includes(e.key)) return;
        const key = KEYS[e.code] ?? KEYS[e.key];
        if (!key) return;
        e.preventDefault();
        this.bus.emit('key', key);
      });
    }
  }

  addListener(listener: KeyListener) {
    this.bus.on('key', listener);
    return listener;
  }
  removeListener(listener: KeyListener) {
    this.bus.off('key', listener);
  }
  emit(key: RemoteKey) {
    this.bus.emit('key', key);
  }
  claimBack() {}
}

export default new WebRemote();
