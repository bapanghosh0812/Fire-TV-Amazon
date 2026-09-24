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
};

class FireTvRemote implements RemoteControl {
  private bus = mitt<{ key: RemoteKey }>();

  constructor() {
    KeyEvent.onKeyDownListener((e: { keyCode: number }) => {
      const key = CODES[e.keyCode];
      if (key) this.bus.emit('key', key);
    });
    // The Back button goes through the system; we turn it into a key event
    // and swallow it so screens decide what "back" means.
    BackHandler.addEventListener('hardwareBackPress', () => {
      if (this.bus.all.get('key')?.length) {
        this.bus.emit('key', RemoteKey.Back);
        return true;
      }
      return false;
    });
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
