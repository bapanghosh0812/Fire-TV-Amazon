import { useCallback, useEffect, useRef, useState } from 'react';
import { useAudioPlayer } from 'expo-audio';

interface Options {
  pageKey: string;
  audioUrl?: string;
  durationMs: number;
  autoplay: boolean;
  rate?: number;
  onFinished?: () => void;
}

/**
 * One clock for the read-along: follows the narrator audio when a page has
 * it, or runs a silent reading clock when it doesn't (offline demo, muted).
 */
export function useNarration({ pageKey, audioUrl, durationMs, autoplay, rate = 1, onFinished }: Options) {
  const player = useAudioPlayer(audioUrl ? { uri: audioUrl } : null);
  const [playing, setPlaying] = useState(autoplay);
  const [elapsedMs, setElapsedMs] = useState(0);
  const elapsedRef = useRef(0);
  const finishedRef = useRef(false);
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;

  // Reset on page change.
  useEffect(() => {
    finishedRef.current = false;
    elapsedRef.current = 0;
    setElapsedMs(0);
    setPlaying(autoplay);
    if (audioUrl) {
      try {
        player.seekTo(0);
        player.setPlaybackRate(rate);
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey]);

  useEffect(() => {
    if (!audioUrl) return;
    try {
      if (playing) player.play();
      else player.pause();
    } catch {}
  }, [playing, audioUrl, player]);

  useEffect(() => {
    if (!playing) return;
    let last = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      let next: number;
      if (audioUrl) {
        next = Math.round((player.currentTime ?? 0) * 1000);
      } else {
        next = elapsedRef.current + (now - last) * rate;
      }
      last = now;
      elapsedRef.current = next;
      setElapsedMs(next);
      const total = audioUrl && player.duration ? player.duration * 1000 : durationMs;
      if (!finishedRef.current && next >= total - 30) {
        finishedRef.current = true;
        setPlaying(false);
        onFinishedRef.current?.();
      }
    }, 50);
    return () => clearInterval(id);
  }, [playing, audioUrl, durationMs, rate, player]);

  const toggle = useCallback(() => {
    if (finishedRef.current) {
      finishedRef.current = false;
      elapsedRef.current = 0;
      setElapsedMs(0);
      if (audioUrl) player.seekTo(0);
      setPlaying(true);
      return;
    }
    setPlaying((p) => !p);
  }, [audioUrl, player]);

  const restart = useCallback(() => {
    finishedRef.current = false;
    elapsedRef.current = 0;
    setElapsedMs(0);
    if (audioUrl) {
      try {
        player.seekTo(0);
      } catch {}
    }
    setPlaying(true);
  }, [audioUrl, player]);

  return { playing, elapsedMs, toggle, setPlaying, restart };
}
