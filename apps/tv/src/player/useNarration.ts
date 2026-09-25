import { useCallback, useEffect, useRef, useState } from 'react';
import { useAudioPlayer, type AudioSource } from 'expo-audio';
import { duckMusic } from '../audio/director';

interface Options {
  pageKey: string;
  source?: number | string;
  durationMs: number;
  autoplay: boolean;
  rate?: number;
  volume?: number;
  onFinished?: () => void;
}

// A page change swaps the audio player; the previous one can be released while a timer
// still holds it, so every read goes through these guards.
function safe<T>(read: () => T, fallback: T): T {
  try {
    return read();
  } catch {
    return fallback;
  }
}

function toSource(source?: number | string): AudioSource {
  if (source === undefined) return null;
  return typeof source === 'number' ? source : { uri: source };
}

/**
 * One clock for the read-along: follows the narrator audio when a page has it,
 * or runs a silent reading clock when it doesn't (muted, or a language with no voice).
 * The background music ducks under the narrator automatically.
 */
export function useNarration({ pageKey, source, durationMs, autoplay, rate = 1, volume = 1, onFinished }: Options) {
  const player = useAudioPlayer(toSource(source));
  const hasAudio = source !== undefined;
  const [playing, setPlaying] = useState(autoplay);
  const [elapsedMs, setElapsedMs] = useState(0);
  const elapsedRef = useRef(0);
  const finishedRef = useRef(false);
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;

  // Reset on page (or language) change.
  useEffect(() => {
    finishedRef.current = false;
    elapsedRef.current = 0;
    setElapsedMs(0);
    setPlaying(autoplay);
    if (hasAudio) {
      try {
        player.seekTo(0);
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey, source]);

  useEffect(() => {
    if (!hasAudio) return;
    try {
      player.setPlaybackRate(rate, 'high');
    } catch {}
  }, [rate, hasAudio, player]);

  useEffect(() => {
    if (!hasAudio) return;
    try {
      player.volume = volume;
    } catch {}
  }, [volume, hasAudio, player]);

  useEffect(() => {
    duckMusic(playing && hasAudio);
    if (!hasAudio) return;
    try {
      if (playing) player.play();
      else player.pause();
    } catch {}
  }, [playing, hasAudio, player]);

  useEffect(() => () => duckMusic(false), []);

  useEffect(() => {
    if (!playing) return;
    let last = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      let next: number;
      if (hasAudio) {
        next = Math.round(safe(() => player.currentTime ?? 0, elapsedRef.current / 1000) * 1000);
      } else {
        next = elapsedRef.current + (now - last) * rate;
      }
      last = now;
      elapsedRef.current = next;
      setElapsedMs(next);
      const duration = hasAudio ? safe(() => player.duration, 0) : 0;
      const total = duration ? duration * 1000 : durationMs;
      const ended = hasAudio ? !safe(() => player.playing, true) && next > 200 && next >= total - 250 : next >= total - 30;
      if (!finishedRef.current && (ended || next >= total - 30)) {
        finishedRef.current = true;
        setPlaying(false);
        onFinishedRef.current?.();
      }
    }, 50);
    return () => clearInterval(id);
  }, [playing, hasAudio, durationMs, rate, player]);

  const toggle = useCallback(() => {
    if (finishedRef.current) {
      finishedRef.current = false;
      elapsedRef.current = 0;
      setElapsedMs(0);
      if (hasAudio) safe(() => player.seekTo(0), undefined);
      setPlaying(true);
      return;
    }
    setPlaying((p) => !p);
  }, [hasAudio, player]);

  const restart = useCallback(() => {
    finishedRef.current = false;
    elapsedRef.current = 0;
    setElapsedMs(0);
    if (hasAudio) {
      try {
        player.seekTo(0);
      } catch {}
    }
    setPlaying(true);
  }, [hasAudio, player]);

  return { playing, elapsedMs, toggle, setPlaying, restart, hasAudio };
}
