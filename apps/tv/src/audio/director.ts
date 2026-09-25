import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { useSettings } from '../state/settings';

// Storyloom's own music and interface sounds (tools/audio/compose.py), all original.
export type Mood = 'home' | 'cozy' | 'adventure' | 'silly' | 'curious';
const MUSIC: Record<Mood, number> = {
  home: require('../../assets/audio/music/home.mp3'),
  cozy: require('../../assets/audio/music/cozy.mp3'),
  adventure: require('../../assets/audio/music/adventure.mp3'),
  silly: require('../../assets/audio/music/silly.mp3'),
  curious: require('../../assets/audio/music/curious.mp3'),
};

export type Sfx = 'focus' | 'select' | 'back' | 'page' | 'magic' | 'ready' | 'error' | 'toggle';
const SFX: Record<Sfx, number> = {
  focus: require('../../assets/audio/sfx/focus.mp3'),
  select: require('../../assets/audio/sfx/select.mp3'),
  back: require('../../assets/audio/sfx/back.mp3'),
  page: require('../../assets/audio/sfx/page.mp3'),
  magic: require('../../assets/audio/sfx/magic.mp3'),
  ready: require('../../assets/audio/sfx/ready.mp3'),
  error: require('../../assets/audio/sfx/error.mp3'),
  toggle: require('../../assets/audio/sfx/toggle.mp3'),
};
// Focus ticks can fire several times a second, so they get a few voices.
const VOICES: Partial<Record<Sfx, number>> = { focus: 3, select: 2 };

let ready = false;
function init() {
  if (ready) return;
  ready = true;
  setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: false,
    interruptionMode: 'mixWithOthers',
  }).catch(() => {});
}

// ------------------------------------------------------------------ music bed
let current: { mood: Mood; player: AudioPlayer } | null = null;
let ducked = false;
let fadeTimer: ReturnType<typeof setInterval> | null = null;

function profileGain() {
  const s = useSettings.getState();
  if (s.soundProfile === 'night') return 0.6;
  return 1;
}

/** Target music volume from settings, lowered under the narrator ("ducking"). */
function musicTarget() {
  const s = useSettings.getState();
  if (!s.music) return 0;
  const duck = ducked ? (s.soundProfile === 'clear' ? 0.22 : 0.42) : 1;
  const clear = s.soundProfile === 'clear' ? 0.7 : 1;
  return Math.min(1, s.musicVolume * duck * clear * profileGain());
}

function rampTo(player: AudioPlayer, target: number, ms: number, done?: () => void) {
  let start = 0;
  try {
    start = player.volume ?? 0;
  } catch {}
  const t0 = Date.now();
  const id = setInterval(() => {
    const k = Math.min(1, (Date.now() - t0) / ms);
    try {
      player.volume = start + (target - start) * k;
    } catch {}
    if (k >= 1) {
      clearInterval(id);
      done?.();
    }
  }, 40);
  return id;
}

export function playMusic(mood: Mood) {
  init();
  if (current?.mood === mood) {
    updateMusicVolume();
    return;
  }
  const previous = current;
  const player = createAudioPlayer(MUSIC[mood]);
  player.loop = true;
  player.volume = 0;
  player.play();
  current = { mood, player };
  if (fadeTimer) clearInterval(fadeTimer);
  fadeTimer = rampTo(player, musicTarget(), 1800);
  if (previous) {
    rampTo(previous.player, 0, 1400, () => {
      try {
        previous.player.remove();
      } catch {}
    });
  }
}

export function stopMusic() {
  const previous = current;
  current = null;
  if (previous) rampTo(previous.player, 0, 900, () => previous.player.remove());
}

export function duckMusic(on: boolean) {
  if (ducked === on) return;
  ducked = on;
  if (current) {
    if (fadeTimer) clearInterval(fadeTimer);
    fadeTimer = rampTo(current.player, musicTarget(), on ? 350 : 900);
  }
}

export function updateMusicVolume() {
  if (!current) return;
  if (fadeTimer) clearInterval(fadeTimer);
  fadeTimer = rampTo(current.player, musicTarget(), 300);
}

// Keep the music in step with Settings (volume slider, music on/off, sound profile).
useSettings.subscribe((s, prev) => {
  if (s.music !== prev.music || s.musicVolume !== prev.musicVolume || s.soundProfile !== prev.soundProfile) updateMusicVolume();
});

// ------------------------------------------------------------------ interface sounds
const pool: Partial<Record<Sfx, { players: AudioPlayer[]; next: number }>> = {};

export function sfx(name: Sfx) {
  const s = useSettings.getState();
  if (!s.sfx) return;
  if (name === 'focus' && !s.focusSounds) return;
  init();
  let slot = pool[name];
  if (!slot) {
    slot = { players: Array.from({ length: VOICES[name] ?? 1 }, () => createAudioPlayer(SFX[name])), next: 0 };
    pool[name] = slot;
  }
  const player = slot.players[slot.next];
  slot.next = (slot.next + 1) % slot.players.length;
  const base = name === 'focus' ? 0.35 : 1;
  const night = s.soundProfile === 'night' ? 0.5 : 1;
  try {
    player.volume = Math.min(1, s.sfxVolume * base * night);
    player.seekTo(0);
    player.play();
  } catch {}
}

/** Warm up the most common sounds so the first press isn't silent. */
export function preloadSounds() {
  init();
  (['focus', 'select', 'back'] as Sfx[]).forEach((n) => {
    if (!pool[n]) pool[n] = { players: Array.from({ length: VOICES[n] ?? 1 }, () => createAudioPlayer(SFX[n])), next: 0 };
  });
}
