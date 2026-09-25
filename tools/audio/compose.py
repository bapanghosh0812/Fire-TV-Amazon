"""Compose Storyloom's original background music and interface sounds.

Everything is synthesized from scratch in code (additive, FM and plucked-string
synthesis with a generated reverb), so there is no third-party audio anywhere.

    tools/sky/.venv/Scripts/python tools/audio/compose.py

Writes apps/tv/assets/audio/music/<mood>.mp3 (seamless loops) and sfx/<name>.mp3.
"""
from __future__ import annotations

import subprocess
from pathlib import Path

import imageio_ffmpeg
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "apps" / "tv" / "assets" / "audio"
SR = 44100
rng = np.random.default_rng(20261023)

NOTE = {n: i for i, n in enumerate(["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"])}


def hz(name: str) -> float:
    """'A4' -> 440.0"""
    pitch, octave = name[:-1], int(name[-1])
    return 440.0 * 2 ** ((NOTE[pitch] + 12 * (octave + 1) - 69) / 12)


def t_axis(sec: float) -> np.ndarray:
    return np.arange(int(sec * SR)) / SR


def adsr(n: int, a: float, d: float, s: float, r: float) -> np.ndarray:
    a_n, d_n, r_n = int(a * SR), int(d * SR), int(r * SR)
    env = np.full(n, float(s))
    env[: min(a_n, n)] = np.linspace(0, 1, a_n)[: min(a_n, n)]
    if a_n < n:
        seg = np.linspace(1, s, d_n)[: max(0, min(d_n, n - a_n))]
        env[a_n : a_n + len(seg)] = seg
    if r_n and r_n < n:
        env[-r_n:] *= np.linspace(1, 0, r_n)
    return env


def _spectral(x: np.ndarray, response) -> np.ndarray:
    """Zero-phase filtering in the frequency domain (offline, so no IIR needed)."""
    n = x.shape[0]
    size = 1 << max(1, (n - 1).bit_length())
    spec = np.fft.rfft(x, n=size, axis=0)
    h = response(np.fft.rfftfreq(size, 1 / SR))
    return np.fft.irfft(spec * (h[:, None] if x.ndim == 2 else h), n=size, axis=0)[:n]


def lowpass(x: np.ndarray, cutoff: float, order: int = 2) -> np.ndarray:
    return _spectral(x, lambda f: 1 / np.sqrt(1 + (f / cutoff) ** (2 * order)))


def highpass(x: np.ndarray, cutoff: float, order: int = 2) -> np.ndarray:
    return _spectral(x, lambda f: 1 / np.sqrt(1 + (cutoff / np.maximum(f, 1e-3)) ** (2 * order)))


def fftconvolve(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    n = len(a) + len(b) - 1
    size = 1 << (n - 1).bit_length()
    return np.fft.irfft(np.fft.rfft(a, size) * np.fft.rfft(b, size), size)[:n]


# ------------------------------------------------------------------ instruments
def music_box(f: float, dur: float = 2.6) -> np.ndarray:
    t = t_axis(dur)
    partials = [(1.0, 1.0, 1.6), (2.76, 0.32, 3.2), (5.4, 0.14, 6.0), (8.93, 0.06, 9.0)]
    y = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * k) for r, a, k in partials)
    click = rng.standard_normal(len(t)) * np.exp(-t * 400) * 0.05
    return (y + click) * adsr(len(t), 0.002, 0.05, 1, 0.05)


def electric_piano(f: float, dur: float = 2.2, vel: float = 1.0) -> np.ndarray:
    t = t_axis(dur)
    index = 1.4 * vel * np.exp(-t * 3.5)
    mod = np.sin(2 * np.pi * f * t) * index
    y = np.sin(2 * np.pi * f * t + mod) * np.exp(-t * 1.2)
    y += 0.25 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t * 2.5)
    return y * adsr(len(t), 0.004, 0.3, 0.8, 0.25) * vel


def celesta(f: float, dur: float = 2.0) -> np.ndarray:
    t = t_axis(dur)
    y = np.sin(2 * np.pi * f * t) * np.exp(-t * 2.2) + 0.35 * np.sin(2 * np.pi * f * 4.0 * t) * np.exp(-t * 6)
    y += 0.12 * np.sin(2 * np.pi * f * 3.0 * t) * np.exp(-t * 4)
    return y * adsr(len(t), 0.003, 0.1, 1, 0.1)


def marimba(f: float, dur: float = 0.9) -> np.ndarray:
    t = t_axis(dur)
    y = np.sin(2 * np.pi * f * t) * np.exp(-t * 7) + 0.3 * np.sin(2 * np.pi * f * 3.93 * t) * np.exp(-t * 22)
    y += 0.08 * rng.standard_normal(len(t)) * np.exp(-t * 300)
    return y * adsr(len(t), 0.001, 0.05, 1, 0.05)


def pluck(f: float, dur: float = 1.8, bright: float = 0.5) -> np.ndarray:
    """Karplus-Strong plucked string, vectorised one period at a time."""
    n = int(dur * SR)
    period = max(2, int(round(SR / f)))
    buf = lowpass(rng.uniform(-1, 1, period), 800 + 6000 * bright, 1)
    out = np.empty(n)
    decay = 0.996
    i = 0
    while i < n:
        k = min(period, n - i)
        out[i : i + k] = buf[:k]
        buf = decay * 0.5 * (buf + np.roll(buf, -1))
        i += k
    return out * adsr(n, 0.001, 0.05, 1, 0.08)


def pad(freqs: list[float], dur: float, bright: float = 0.35) -> np.ndarray:
    """Warm string-like pad: detuned band-limited saws, slow swells, stereo spread."""
    t = t_axis(dur)
    left = np.zeros(len(t))
    right = np.zeros(len(t))
    for f in freqs:
        for detune, pan in ((-0.07, 0.2), (0.0, 0.5), (0.08, 0.8)):
            ff = f * 2 ** (detune / 12)
            harmonics = max(1, int(min(24, 5000 / ff)))
            wave = sum((1 / h) * np.sin(2 * np.pi * ff * h * t + rng.uniform(0, 6.28)) * (bright ** ((h - 1) / 6)) for h in range(1, harmonics + 1))
            left += wave * (1 - pan)
            right += wave * pan
    env = adsr(len(t), min(1.6, dur * 0.3), 0.5, 0.85, min(1.8, dur * 0.35))
    lfo = 1 + 0.05 * np.sin(2 * np.pi * 0.2 * t)
    y = np.stack([left, right], axis=1) * (env * lfo)[:, None]
    return lowpass(y, 1400 + 3000 * bright) / (len(freqs) * 3)


def soft_kick(dur: float = 0.5) -> np.ndarray:
    t = t_axis(dur)
    f = 90 * np.exp(-t * 14) + 45
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)


def shaker(dur: float = 0.12) -> np.ndarray:
    t = t_axis(dur)
    return highpass(rng.standard_normal(len(t)), 5000) * np.exp(-t * 45) * 0.35


def woodblock(f: float = 900) -> np.ndarray:
    t = t_axis(0.15)
    return (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 2.7 * t)) * np.exp(-t * 60)


# ------------------------------------------------------------------ mixing helpers
class Track:
    def __init__(self, seconds: float):
        self.buf = np.zeros((int(seconds * SR) + SR * 4, 2))
        self.length = int(seconds * SR)

    def add(self, sound: np.ndarray, at: float, gain: float = 1.0, pan: float = 0.5) -> None:
        if sound.ndim == 1:
            sound = np.stack([sound * np.sqrt(1 - pan), sound * np.sqrt(pan)], axis=1)
        i = int(at * SR)
        self.buf[i : i + len(sound)] += sound * gain

    def loop(self) -> np.ndarray:
        """Fold the tail back onto the start so the loop is seamless."""
        y = self.buf[: self.length].copy()
        tail = self.buf[self.length :]
        y[: len(tail)] += tail
        return y


def reverb(y: np.ndarray, seconds: float = 2.8, mix: float = 0.28, circular: bool = True) -> np.ndarray:
    n = int(seconds * SR)
    t = np.arange(n) / SR
    ir = rng.standard_normal((n, 2)) * np.exp(-t * (6.9 / seconds))[:, None]
    ir = lowpass(ir, 6000)
    ir[: int(0.012 * SR)] = 0  # pre-delay
    ir /= np.sqrt((ir**2).sum(axis=0))
    wet = np.stack([fftconvolve(y[:, c], ir[:, c]) for c in range(2)], axis=1)
    if circular:
        body = wet[: len(y)].copy()
        rest = wet[len(y) :]
        while len(rest):
            k = min(len(rest), len(body))
            body[:k] += rest[:k]
            rest = rest[k:]
        wet = body
    else:
        y = np.pad(y, ((0, len(wet) - len(y)), (0, 0)))
    return y * (1 - mix) + wet * mix * 1.6


def encode(y: np.ndarray, path: Path, bitrate: str = "160k", loudness: float | None = -20.0) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    y = y / (np.abs(y).max() + 1e-9) * 0.9
    pcm = (y * 32767).astype("<i2").tobytes()
    af = ["-af", f"loudnorm=I={loudness}:TP=-2:LRA=11"] if loudness is not None else []
    subprocess.run(
        [imageio_ffmpeg.get_ffmpeg_exe(), "-v", "error", "-y", "-f", "s16le", "-ar", str(SR), "-ac", "2", "-i", "-",
         *af, "-ar", "44100", "-c:a", "libmp3lame", "-b:a", bitrate, str(path)],
        input=pcm, check=True,
    )
    print(f"wrote {path.relative_to(ROOT)}")


# ------------------------------------------------------------------ pieces
def chord(names: str) -> list[float]:
    return [hz(n) for n in names.split()]


def piece(bpm: float, bars: int, progression: list[str], voice, pattern: list[tuple[float, int, float]],
          pad_bright: float, melody=None, extras=None, pad_gain: float = 0.55, voice_gain: float = 0.35) -> np.ndarray:
    beat = 60 / bpm
    bar = beat * 4
    tr = Track(bars * bar)
    for b in range(bars):
        names = progression[b % len(progression)]
        freqs = chord(names)
        tr.add(pad(freqs, bar + 1.2, pad_bright), b * bar, pad_gain)
        for pos, idx, vel in pattern:
            f = freqs[idx % len(freqs)] * (2 if idx >= len(freqs) else 1)
            tr.add(voice(f * 2), b * bar + pos * beat, voice_gain * vel, pan=0.35 + 0.3 * rng.random())
        if extras:
            extras(tr, b, b * bar, beat, freqs)
    if melody:
        melody(tr, bar, beat)
    return reverb(tr.loop())


def cozy() -> np.ndarray:
    prog = ["C3 E3 G3 B3", "A2 C3 E3 G3", "F2 A2 C3 E3", "G2 B2 D3 F3"]
    pat = [(0, 0, 1), (1, 2, 0.7), (2, 1, 0.8), (3, 3, 0.6)]
    tune = ["E5", "G5", "A5", "G5", "E5", "D5", "C5", "D5", "E5", "G5", "E5", "D5", "C5", "A4", "G4", "C5"]

    def melody(tr: Track, bar: float, beat: float) -> None:
        for i, n in enumerate(tune * 2):
            tr.add(music_box(hz(n)), i * beat * 2 + beat, 0.28, pan=0.55)

    return piece(64, 16, prog, electric_piano, pat, 0.25, melody, pad_gain=0.6, voice_gain=0.18)


def adventure() -> np.ndarray:
    prog = ["D3 F3 A3 C4", "A#2 D3 F3 A3", "F2 A2 C3 E3", "C3 E3 G3 D4"]
    pat = [(p / 2, i, 0.9 if p % 2 == 0 else 0.6) for p, i in enumerate([0, 1, 2, 3, 2, 1, 2, 3])]

    def extras(tr: Track, b: int, start: float, beat: float, freqs: list[float]) -> None:
        tr.add(soft_kick(), start, 0.55)
        tr.add(soft_kick(), start + 2 * beat, 0.4)
        for k in range(8):
            tr.add(shaker(), start + k * beat / 2 + beat / 4, 0.25, pan=0.7)
        tr.add(pluck(freqs[0] / 2, 1.6, 0.3), start, 0.5)
        tr.add(pluck(freqs[0] / 2, 1.2, 0.3), start + 2.5 * beat, 0.35)

    return piece(96, 16, prog, lambda f: pluck(f, 1.4, 0.55), pat, 0.4, extras=extras, voice_gain=0.3)


def silly() -> np.ndarray:
    prog = ["G3 B3 D4", "C3 E3 G3", "D3 F#3 A3", "G3 B3 D4"]
    pat = [(0, 0, 1), (0.5, 2, 0.6), (1, 1, 0.8), (1.75, 2, 0.5), (2, 0, 0.9), (2.5, 1, 0.6), (3, 2, 0.8), (3.5, 3, 0.7)]

    def extras(tr: Track, b: int, start: float, beat: float, freqs: list[float]) -> None:
        for k in (0, 2):
            tr.add(pluck(freqs[0] / 2, 0.5, 0.2), start + k * beat, 0.45)
        tr.add(pluck(freqs[2] / 2, 0.5, 0.2), start + 1 * beat, 0.35)
        tr.add(pluck(freqs[1] / 2, 0.5, 0.2), start + 3 * beat, 0.35)
        tr.add(woodblock(1100 if b % 2 else 850), start + 3.5 * beat, 0.25, pan=0.8)

    return piece(118, 16, prog, marimba, pat, 0.3, extras=extras, pad_gain=0.3, voice_gain=0.4)


def curious() -> np.ndarray:
    prog = ["E3 G3 B3 F#4", "C3 E3 G3 B3", "G2 B2 D3 F#3", "D3 F#3 A3 E4"]
    pat = [(p / 2, i, 0.8 - 0.05 * p) for p, i in enumerate([0, 1, 2, 3, 4, 3, 2, 1])]
    return piece(80, 16, prog, celesta, pat, 0.45, pad_gain=0.6, voice_gain=0.22)


def home() -> np.ndarray:
    prog = ["F3 A3 C4 E4", "E3 G3 B3 D4", "D3 F3 A3 C4", "C3 E3 G3 B3"]
    pat = [(0, 3, 0.7), (1.5, 2, 0.5), (3, 1, 0.45)]
    motif = [("A4", 0), ("C5", 1), ("E5", 1.5), ("D5", 3), ("C5", 4.5), ("G4", 6), ("A4", 7)]

    def melody(tr: Track, bar: float, beat: float) -> None:
        for rep in (0, 8):
            for n, pos in motif:
                tr.add(electric_piano(hz(n), 2.6, 0.8), (rep + pos) * bar / 2, 0.16, pan=0.45)

    return piece(70, 16, prog, electric_piano, pat, 0.3, melody, pad_gain=0.65, voice_gain=0.12)


# ------------------------------------------------------------------ interface sounds
def sfx() -> dict[str, np.ndarray]:
    s: dict[str, np.ndarray] = {}
    t = t_axis(0.09)
    s["focus"] = (np.sin(2 * np.pi * 2100 * t) * np.exp(-t * 90) * 0.18)

    chime = np.zeros(int(0.9 * SR))
    for f, at in ((hz("E6"), 0), (hz("B6"), 0.07)):
        c = celesta(f, 0.8)
        i = int(at * SR)
        chime[i : i + len(c)] += c[: len(chime) - i] * 0.5
    s["select"] = chime

    t = t_axis(0.45)
    noise = rng.standard_normal(len(t))
    sweep = np.concatenate([lowpass(noise[i : i + 2205], max(300, 3000 * (1 - i / len(t)))) for i in range(0, len(t), 2205)])
    s["back"] = sweep[: len(t)] * np.sin(np.pi * t / t[-1]) * 0.35 + np.sin(2 * np.pi * hz("A3") * t) * np.exp(-t * 8) * 0.25

    t = t_axis(0.6)
    paper = highpass(rng.standard_normal(len(t)), 1800)
    env = np.exp(-((t - 0.12) / 0.06) ** 2) * 0.6 + np.exp(-((t - 0.3) / 0.1) ** 2) * 0.35
    s["page"] = lowpass(paper * env, 7000) * 0.5

    sparkle = np.zeros(int(1.4 * SR))
    for k in range(9):
        f = hz(["C6", "E6", "G6", "B6", "D7", "E7", "G7", "A7", "C8"][k])
        c = celesta(f, 0.9) * (0.5 - k * 0.03)
        i = int(k * 0.055 * SR)
        sparkle[i : i + len(c)] += c[: len(sparkle) - i]
    s["magic"] = sparkle

    harp = np.zeros(int(2.4 * SR))
    for k, n in enumerate(["C4", "E4", "G4", "C5", "E5", "G5", "C6", "E6"]):
        p = pluck(hz(n), 1.8, 0.6) * 0.4
        i = int(k * 0.06 * SR)
        harp[i : i + len(p)] += p[: len(harp) - i]
    s["ready"] = harp

    t = t_axis(0.5)
    s["error"] = (np.sin(2 * np.pi * hz("E4") * t) * (t < 0.18) + np.sin(2 * np.pi * hz("C4") * t) * (t >= 0.18)) * np.exp(-t * 6) * 0.3

    t = t_axis(0.07)
    s["toggle"] = np.sin(2 * np.pi * 1400 * t) * np.exp(-t * 70) * 0.25
    return s


def main() -> None:
    for name, fn in (("home", home), ("cozy", cozy), ("adventure", adventure), ("silly", silly), ("curious", curious)):
        encode(fn(), OUT / "music" / f"{name}.mp3", "160k", -21.0)
    for name, y in sfx().items():
        stereo = np.stack([y, y], axis=1)
        encode(reverb(stereo, 1.2, 0.18, circular=False), OUT / "sfx" / f"{name}.mp3", "128k", None)


if __name__ == "__main__":
    main()
