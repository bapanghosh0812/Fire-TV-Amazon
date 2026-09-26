"""Compose Storyloom's music channels and sleep sounds.

Every note and every raindrop is generated here: melodies come from seeded
phrase-building (motif, variation, contrast, return), and the nature sounds
are synthesized from filtered noise and small physical models. Nothing is
sampled, so all of it is original.

    tools/sky/.venv/Scripts/python tools/audio/channels.py

Writes apps/tv/assets/audio/channels/<channel>-<n>.mp3 and apps/tv/assets/audio/sleep/<sound>.mp3.
Sleep sounds are exactly periodic (circular filtering and wrapped events), so they loop with no seam.
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

import imageio_ffmpeg
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from compose import (  # noqa: E402
    SR, Track, celesta, electric_piano, marimba, music_box, pad, pluck, reverb, shaker, soft_kick, woodblock,
)

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "apps" / "tv" / "assets" / "audio"

SCALES = {"major": [0, 2, 4, 5, 7, 9, 11], "minor": [0, 2, 3, 5, 7, 8, 10]}
PROGRESSIONS = {
    "major": [[0, 4, 5, 3], [0, 5, 3, 4], [3, 0, 4, 5], [0, 3, 5, 4], [5, 3, 0, 4]],
    "minor": [[0, 5, 2, 6], [0, 3, 6, 2], [0, 6, 5, 4], [0, 5, 3, 4]],
}
RHYTHMS = [[2, 1, 1], [1, 1, 1, 1], [3, 1], [1.5, 0.5, 2], [1, 1, 2], [2, 2], [0.5, 0.5, 1, 2], [1, 0.5, 0.5, 2]]


def mhz(m: float) -> float:
    return 440.0 * 2 ** ((m - 69) / 12)


def degree_midi(key: int, mode: str, degree: int) -> int:
    s = SCALES[mode]
    return key + s[degree % 7] + 12 * (degree // 7)


def chord_midi(key: int, mode: str, degree: int, seventh: bool = True) -> list[int]:
    return [degree_midi(key, mode, degree + k) for k in ((0, 2, 4, 6) if seventh else (0, 2, 4))]


def make_melody(rng: np.random.Generator, key: int, mode: str, prog: list[int], bars: int, low: int, high: int):
    """Phrases of A A' B A over the progression: a motif, a varied answer, a contrast and the return."""
    def bar_notes(bar: int, prev: int, rhythm: list[float]):
        chord = {m % 12 for m in chord_midi(key, mode, prog[bar % len(prog)])}
        notes, pos = [], 0.0
        deg = prev
        for i, d in enumerate(rhythm):
            if i == 0 or d >= 2:  # strong beats land on chord tones
                cands = [x for x in range(deg - 4, deg + 5) if degree_midi(key, mode, x) % 12 in chord]
                deg = min(cands, key=lambda x: abs(x - deg) + rng.random() * 1.5) if cands else deg
            else:
                deg += int(rng.choice([-2, -1, -1, 1, 1, 2]))
            while degree_midi(key, mode, deg) > high:
                deg -= 7
            while degree_midi(key, mode, deg) < low:
                deg += 7
            notes.append((pos, degree_midi(key, mode, deg), d))
            pos += d
        return notes, deg

    out: list[tuple[float, int, float]] = []
    deg = 7 + int(rng.integers(0, 3))
    b = 0
    while b < bars:
        motif = []
        rhythm_a = [RHYTHMS[int(rng.integers(len(RHYTHMS)))] for _ in range(2)]
        rhythm_b = [RHYTHMS[int(rng.integers(len(RHYTHMS)))] for _ in range(2)]
        for part in range(4):  # A A' B A, two bars each
            for k in range(2):
                if b >= bars:
                    break
                rhythm = rhythm_b[k] if part == 2 else rhythm_a[k]
                if part in (0, 2) or not motif:
                    notes, deg = bar_notes(b, deg, rhythm)
                    if part == 0:
                        motif.append(notes)
                else:
                    notes = [(p, m, d) for p, m, d in motif[k % len(motif)]]
                    if part == 1 and k == 1:  # the answer ends somewhere new
                        p, m, d = notes[-1]
                        notes[-1] = (p, m + int(rng.choice([-3, -2, 2, 3])), d)
                out.extend((b * 4 + p, m, d) for p, m, d in notes)
                b += 1
        # A breath between phrases now and then: accompaniment only.
        if b < bars and rng.random() < 0.35:
            b += 2
    return out


def track(seed: int, key: int, mode: str, bpm: float, seconds: float, lead, lead_gain: float, arp, arp_gain: float,
          arp_pattern: list[tuple[float, int, float]], pad_bright: float, pad_gain: float, extras=None,
          melody_range: tuple[int, int] = (64, 84)) -> np.ndarray:
    rng = np.random.default_rng(seed)
    beat = 60 / bpm
    bar = beat * 4
    bars = max(8, int(round(seconds / bar / 8)) * 8)
    prog = PROGRESSIONS[mode][int(rng.integers(len(PROGRESSIONS[mode])))]
    tr = Track(bars * bar)
    for b in range(bars):
        chord = chord_midi(key, mode, prog[b % len(prog)])
        freqs = [mhz(m - 12) for m in chord]
        tr.add(pad(freqs[:3], bar + 1.2, pad_bright), b * bar, pad_gain)
        for pos, idx, vel in arp_pattern:
            f = freqs[idx % len(freqs)] * (2 if idx >= len(freqs) else 1)
            tr.add(arp(f * 2), b * bar + pos * beat, arp_gain * vel, pan=0.3 + 0.4 * rng.random())
        if extras:
            extras(tr, b, b * bar, beat, freqs)
    for pos, m, d in make_melody(rng, key, mode, prog, bars, *melody_range):
        tr.add(lead(mhz(m), max(0.6, d * beat * 1.6)), pos * beat, lead_gain, pan=0.5 + 0.1 * (rng.random() - 0.5))
    return reverb(tr.loop(), 3.2, 0.3)


def drums(kick: float = 0.5, shake: float = 0.22):
    def extras(tr: Track, b: int, start: float, beat: float, freqs: list[float]) -> None:
        tr.add(soft_kick(), start, kick)
        tr.add(soft_kick(), start + 2 * beat, kick * 0.75)
        for k in range(8):
            tr.add(shaker(), start + k * beat / 2 + beat / 4, shake, pan=0.7)
        tr.add(pluck(freqs[0] / 2, 1.4, 0.3), start, 0.45)
        tr.add(pluck(freqs[0] / 2, 1.0, 0.3), start + 2.5 * beat, 0.3)
    return extras


def bouncy(tr: Track, b: int, start: float, beat: float, freqs: list[float]) -> None:
    for k in (0, 2):
        tr.add(pluck(freqs[0] / 2, 0.5, 0.2), start + k * beat, 0.45)
    tr.add(pluck(freqs[2] / 2, 0.5, 0.2), start + beat, 0.35)
    tr.add(pluck(freqs[1] / 2, 0.5, 0.2), start + 3 * beat, 0.35)
    tr.add(woodblock(1100 if b % 2 else 850), start + 3.5 * beat, 0.22, pan=0.8)


def shimmer(tr: Track, b: int, start: float, beat: float, freqs: list[float]) -> None:
    if b % 2 == 0:
        for k, f in enumerate(freqs):
            tr.add(celesta(f * 4, 3.0), start + k * beat * 0.75, 0.08, pan=0.2 + 0.2 * k)


ARP_SLOW = [(0, 0, 1), (1, 2, 0.7), (2, 1, 0.8), (3, 3, 0.6)]
ARP_WALTZ = [(0, 0, 1), (1.33, 2, 0.6), (2.66, 1, 0.6)]
ARP_EIGHTHS = [(p / 2, i, 0.9 if p % 2 == 0 else 0.6) for p, i in enumerate([0, 1, 2, 3, 2, 1, 2, 3])]
ARP_BOUNCE = [(0, 0, 1), (0.5, 2, 0.6), (1, 1, 0.8), (1.75, 2, 0.5), (2, 0, 0.9), (2.5, 1, 0.6), (3, 2, 0.8), (3.5, 3, 0.7)]

# channel -> list of (seed, key, mode, bpm)
CHANNELS = {
    "lullaby": dict(tracks=[(11, 60, "major", 62), (12, 65, "major", 58), (13, 57, "minor", 60)],
                    make=lambda s, k, m, bpm: track(s, k, m, bpm, 95, lambda f, d: music_box(f, max(2.2, d)), 0.3,
                                                    electric_piano, 0.14, ARP_WALTZ, 0.22, 0.6, melody_range=(67, 86))),
    "piano": dict(tracks=[(21, 62, "major", 68), (22, 57, "minor", 64), (23, 67, "major", 72)],
                  make=lambda s, k, m, bpm: track(s, k, m, bpm, 95, lambda f, d: electric_piano(f, max(1.6, d), 0.8), 0.24,
                                                  electric_piano, 0.12, ARP_SLOW, 0.25, 0.5)),
    "adventure": dict(tracks=[(31, 62, "minor", 100), (32, 65, "major", 104)],
                      make=lambda s, k, m, bpm: track(s, k, m, bpm, 85, lambda f, d: pluck(f, max(1.0, d), 0.6), 0.34,
                                                      lambda f: pluck(f, 1.2, 0.5), 0.22, ARP_EIGHTHS, 0.4, 0.45, drums())),
    "happy": dict(tracks=[(41, 67, "major", 116), (42, 60, "major", 120)],
                  make=lambda s, k, m, bpm: track(s, k, m, bpm, 80, lambda f, d: marimba(f, max(0.7, d)), 0.4,
                                                  marimba, 0.26, ARP_BOUNCE, 0.3, 0.3, bouncy)),
    "dreamy": dict(tracks=[(51, 57, "major", 54), (52, 62, "minor", 50)],
                   make=lambda s, k, m, bpm: track(s, k, m, bpm, 100, lambda f, d: celesta(f, max(2.5, d)), 0.16,
                                                   celesta, 0.06, ARP_SLOW, 0.2, 0.75, shimmer, melody_range=(69, 88))),
}


# ------------------------------------------------------------------ sleep sounds (exactly periodic)
LOOP = 60.0
N = int(LOOP * SR)
rng = np.random.default_rng(1022)


def circ(x: np.ndarray, response) -> np.ndarray:
    """Filter in the frequency domain over exactly one loop, so the result is periodic."""
    spec = np.fft.rfft(x, axis=0)
    h = response(np.fft.rfftfreq(x.shape[0], 1 / SR))
    return np.fft.irfft(spec * (h[:, None] if x.ndim == 2 else h), n=x.shape[0], axis=0)


def colored(slope: float, stereo: bool = True) -> np.ndarray:
    """Noise with power ~ 1/f^slope (0 white, 1 pink, 2 brown)."""
    x = rng.standard_normal((N, 2) if stereo else N)
    y = circ(x, lambda f: 1 / np.maximum(f, 20) ** (slope / 2))
    return y / y.std()


def band(x: np.ndarray, lo: float, hi: float, order: int = 2) -> np.ndarray:
    return circ(x, lambda f: 1 / np.sqrt(1 + (lo / np.maximum(f, 1e-3)) ** (2 * order)) / np.sqrt(1 + (f / hi) ** (2 * order)))


def periodic_lfo(cycles: int, phase: float = 0.0) -> np.ndarray:
    t = np.arange(N) / N
    return np.sin(2 * np.pi * (cycles * t + phase))


def place(buf: np.ndarray, sound: np.ndarray, at: float, gain: float, pan: float) -> None:
    """Add a mono event to a stereo loop, wrapping past the end back to the start."""
    i = int(at * SR) % N
    st = np.stack([sound * np.sqrt(1 - pan), sound * np.sqrt(pan)], axis=1) * gain
    k = min(len(st), N - i)
    buf[i : i + k] += st[:k]
    if k < len(st):
        buf[: len(st) - k] += st[k:]


def burst(dur: float, f: float, decay: float, noise: float = 0.0) -> np.ndarray:
    t = np.arange(int(dur * SR)) / SR
    y = np.sin(2 * np.pi * f * t) * (1 - noise) + rng.standard_normal(len(t)) * noise
    return y * np.exp(-t * decay)


def rain() -> np.ndarray:
    bed = band(colored(1), 500, 9000) * 0.5 + band(colored(2), 60, 400) * 0.25
    y = bed * (1 + 0.12 * periodic_lfo(3)[:, None])
    drops = np.zeros((N, 2))
    for _ in range(int(LOOP * 70)):  # fine patter
        place(drops, burst(0.006, rng.uniform(2500, 6500), 700, 0.6), rng.uniform(0, LOOP), rng.uniform(0.05, 0.25), rng.random())
    for _ in range(int(LOOP * 3)):  # nearby drips off the eaves
        f = rng.uniform(900, 1900)
        t = np.arange(int(0.06 * SR)) / SR
        plink = np.sin(2 * np.pi * f * (1 + 0.4 * t / 0.06) * t) * np.exp(-t * 60)
        place(drops, plink, rng.uniform(0, LOOP), rng.uniform(0.1, 0.3), rng.uniform(0.2, 0.8))
    return y + band(drops, 300, 12000)


def ocean() -> np.ndarray:
    dark = band(colored(2), 40, 700)
    hiss = band(colored(1), 700, 7000)
    t = np.arange(N) / SR
    env = np.zeros(N)
    starts = np.cumsum(rng.uniform(8.5, 11.5, 6))
    starts = starts / starts[-1] * LOOP  # exactly six waves per loop
    for s in starts:
        d = (t - s) % LOOP  # time since this wave broke, wrapped
        env += np.where(d < LOOP / 2, np.exp(-d / 3.2) * (1 - np.exp(-d / 0.25)), 0)
        pre = (s - t) % LOOP  # the swell rising before it breaks
        env += np.where(pre < 3.5, 0.35 * (1 - pre / 3.5) ** 2, 0)
    env = env / env.max()
    y = dark * (0.35 + 0.65 * env)[:, None] + hiss * (0.1 + 0.9 * env**1.5)[:, None] * 0.55
    return y


def forest() -> np.ndarray:
    y = band(colored(1), 150, 1200) * 0.12 * (1 + 0.4 * periodic_lfo(2)[:, None])  # a breath of wind
    bed = band(colored(0), 3800, 6200) * (1 + 0.5 * periodic_lfo(int(LOOP * 28)))[:, None] * 0.04  # distant crickets
    y += bed
    for f, pan, every in ((4600, 0.25, 0.62), (5100, 0.75, 0.8), (4200, 0.5, 1.1)):
        t0 = rng.uniform(0, 1)
        while t0 < LOOP:
            for p in range(int(rng.integers(3, 5))):
                t = np.arange(int(0.016 * SR)) / SR
                pulse = np.sin(2 * np.pi * f * t) * np.sin(np.pi * t / t[-1])
                place(y, pulse, t0 + p * 0.03, 0.06, pan)
            t0 += every * rng.uniform(0.85, 1.15)
    for at in (9.0, 38.0):  # an owl, far away
        for k, f0 in enumerate((390, 360)):
            t = np.arange(int(0.45 * SR)) / SR
            hoot = np.sin(2 * np.pi * (f0 - 25 * t) * t) * np.sin(np.pi * t / t[-1]) ** 2
            hoot += 0.15 * band(rng.standard_normal(len(t)), 300, 900) * np.sin(np.pi * t / t[-1])
            place(y, hoot, at + k * 0.6, 0.07, 0.15)
    return y


def wind() -> np.ndarray:
    y = np.zeros((N, 2))
    for lo, hi, cyc, ph in ((150, 400, 2, 0.0), (300, 800, 3, 0.3), (600, 1500, 4, 0.6), (1200, 3000, 5, 0.1)):
        g = np.clip(0.5 + 0.5 * periodic_lfo(cyc, ph) + 0.25 * periodic_lfo(cyc * 3, ph * 2), 0, None)
        y += band(colored(1), lo, hi, 3) * g[:, None]
    return y * 0.5


def fire() -> np.ndarray:
    y = band(colored(2), 40, 350) * 0.4 * (1 + 0.25 * periodic_lfo(7)[:, None])
    for _ in range(int(LOOP * 10)):
        place(y, burst(rng.uniform(0.001, 0.004), 0, 900, 1.0), rng.uniform(0, LOOP), rng.uniform(0.05, 0.3), rng.random())
    for _ in range(int(LOOP * 0.4)):
        place(y, burst(0.05, rng.uniform(700, 1800), 90, 0.5), rng.uniform(0, LOOP), rng.uniform(0.2, 0.45), rng.random())
    return band(y, 30, 9000)


def stream() -> np.ndarray:
    y = band(colored(1), 700, 4500) * 0.25 * (1 + 0.15 * periodic_lfo(11)[:, None])
    for _ in range(int(LOOP * 45)):
        d = rng.uniform(0.008, 0.03)
        t = np.arange(int(d * SR)) / SR
        f0 = rng.uniform(450, 1800)
        bub = np.sin(2 * np.pi * f0 * (1 + 0.8 * t / d) * t) * np.exp(-t / (d / 3))
        place(y, bub, rng.uniform(0, LOOP), rng.uniform(0.02, 0.1), rng.random())
    return y


def hush() -> np.ndarray:
    y = band(colored(2), 30, 900)
    return y * (1 + 0.18 * periodic_lfo(5))[:, None]


SLEEP = {"rain": rain, "ocean": ocean, "forest": forest, "wind": wind, "fire": fire, "stream": stream, "hush": hush}


def encode(y: np.ndarray, path: Path, bitrate: str, rms: float | None = None, loudness: float | None = None) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if rms is not None:  # linear gain keeps a periodic loop periodic
        y = y / (np.sqrt(np.mean(y**2)) + 1e-9) * rms
    else:
        y = y / (np.abs(y).max() + 1e-9) * 0.9
    y = np.clip(y, -0.98, 0.98)
    pcm = (y * 32767).astype("<i2").tobytes()
    af = ["-af", f"loudnorm=I={loudness}:TP=-2:LRA=11"] if loudness is not None else []
    subprocess.run(
        [imageio_ffmpeg.get_ffmpeg_exe(), "-v", "error", "-y", "-f", "s16le", "-ar", str(SR), "-ac", "2", "-i", "-",
         *af, "-ar", "44100", "-c:a", "libmp3lame", "-b:a", bitrate, str(path)],
        input=pcm, check=True,
    )
    print(f"wrote {path.relative_to(ROOT)}", flush=True)


def main() -> None:
    only = set(sys.argv[1:])
    for name, fn in SLEEP.items():
        if only and name not in only:
            continue
        encode(fn(), OUT / "sleep" / f"{name}.mp3", "96k", rms=0.12)
    for name, ch in CHANNELS.items():
        if only and name not in only:
            continue
        for i, (seed, key, mode, bpm) in enumerate(ch["tracks"], 1):
            encode(ch["make"](seed, key, mode, bpm), OUT / "channels" / f"{name}-{i}.mp3", "112k", loudness=-20.0)


if __name__ == "__main__":
    main()
