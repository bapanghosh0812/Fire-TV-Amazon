// Fire OS (Android) implementation: raw key codes from the Fire TV remote,
// forwarded by MainActivity (see plugins/withKeyEvent.js).
import mitt from 'mitt';
import { BackHandler } from 'react-native';
import KeyEvent from 'react-native-keyevent';
import { KeyListener, RemoteControl, RemoteKey } from './keys';

const CODES: Record<number, RemoteKey> = {
  19: RemoteKey.Up,
  20: RemoteKey.Down,
  21: RemoteKey.Left,
  22: RemoteKey.Right,
  23: RemoteKey.Select, // DPAD_CENTER
  66: RemoteKey.Select, // ENTER
  160: RemoteKey.Select, // NUMPAD_ENTER
  85: RemoteKey.PlayPause,
  126: RemoteKey.PlayPause, // MEDIA_PLAY
  127: RemoteKey.PlayPause, // MEDIA_PAUSE
  90: RemoteKey.FastForward,
  89: RemoteKey.Rewind,
  82: RemoteKey.Menu,
  67: RemoteKey.Delete, // DEL (backspace on a keyboard)
  112: RemoteKey.Delete, // FORWARD_DEL
};
// Number keys (some remotes, keyboards and the emulator) type into keypads.
for (let d = 0; d <= 9; d++) {
  CODES[7 + d] = String(d) as RemoteKey; // KEYCODE_0..9
  CODES[144 + d] = String(d) as RemoteKey; // NUMPAD_0..9
}

class FireTvRemote implements RemoteControl {
  private bus = mitt<{ key: RemoteKey }>();

  constructor() {
    KeyEvent.onKeyDownListener((e: { keyCode: number }) => {
      const key = CODES[e.keyCode];
      if (key) this.bus.emit('key', key);
    });
    this.claimBack();
  }

  private backSub?: { remove: () => void };
  private onBack = () => {
    if (this.bus.all.get('key')?.length) {
      this.bus.emit('key', RemoteKey.Back);
      return true;
    }
    return false;
  };

  /**
   * The Back button goes through the system; we turn it into a key event and swallow it so
   * screens decide what "back" means (close a menu first, then leave the page).
   * Android calls the newest listener first, so this is re-claimed after the navigator mounts.
   */
  claimBack() {
    this.backSub?.remove();
    this.backSub = BackHandler.addEventListener('hardwareBackPress', this.onBack);
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

export default new FireTvRemote();
