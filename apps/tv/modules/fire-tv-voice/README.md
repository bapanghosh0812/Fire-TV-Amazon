# fire-tv-voice

**Alexa voice controls for React Native apps on Fire TV.**

Fire TV lets customers say *"Alexa, pause"*, *"Alexa, next"* or *"Alexa, restart"* into the remote (or a
paired Echo) and routes the command to the foreground app's Android `MediaSession`. React Native and Expo
apps don't get this for free: most JS audio players never register a session with the right actions, and
the Fire OS voice permission isn't in any template. `fire-tv-voice` is a tiny Expo module that does both.

```ts
import * as FireTvVoice from 'fire-tv-voice';

FireTvVoice.activate({ title: 'Luna and the Lighthouse', subtitle: 'Page 1 of 7', playing: true });

const off = FireTvVoice.addCommandListener((command, positionMs) => {
  if (command === 'next') nextPage();
  if (command === 'previous') previousPage();
  if (command === 'pause') pause();
  if (command === 'play') play();
  if (command === 'seekTo' && positionMs <= 0) restartPage(); // "Alexa, restart"
});

FireTvVoice.update({ title: 'Luna and the Lighthouse', subtitle: 'Page 2 of 7', playing: true, canPrevious: true });
// later
off();
FireTvVoice.deactivate();
```

## What it does

- Creates a framework `android.media.session.MediaSession` and keeps its `PlaybackState` actions and
  metadata in sync with your app (`ACTION_PLAY`, `PAUSE`, `SKIP_TO_NEXT/PREVIOUS`, `SEEK_TO`, `FAST_FORWARD`, `REWIND`).
- Adds the Fire OS permission `com.amazon.permission.media.session.voicecommandcontrol` and the
  `com.amazon.voice.supports_background_media_session` meta-data through its library manifest (merged automatically).
- Emits one JS event, `onCommand`, for every callback, so apps that aren't "media players" (story books,
  slideshows, recipes, workouts) can map voice to their own navigation.
- No-ops on iOS, tvOS, web and Vega, so shared code stays clean.

| Voice command | Event |
|---|---|
| "Alexa, play" / "resume" | `play` |
| "Alexa, pause" / "stop" | `pause` |
| "Alexa, next" / "fast-forward" | `next` |
| "Alexa, previous" / "rewind" | `previous` |
| "Alexa, restart" | `seekTo` with `positionMs = 0` |

## Testing without a Fire TV

On an Android TV emulator you can fire the same callbacks Alexa would:

```bash
adb shell cmd media_session dispatch next
adb shell cmd media_session dispatch pause
adb shell cmd media_session dispatch previous
```

## Install

Copy this folder into your Expo app's `modules/` directory (Expo autolinks local modules), then rebuild
the native app (`npx expo run:android`). Works with Expo SDK 54 and `react-native-tvos` 0.81.

## License

MIT © Bapan Ghosh and Jayashree Mondal
