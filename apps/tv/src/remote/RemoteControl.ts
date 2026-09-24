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
};

class WebRemote implements RemoteControl {
  private bus = mitt<{ key: RemoteKey }>();

  constructor() {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('keydown', (e) => {
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
}

export default new WebRemote();
