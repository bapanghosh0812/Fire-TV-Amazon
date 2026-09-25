"""Render Storyloom's cinematic sky loops on the local GPU.

    python render.py --stills              one still per phase     -> out/still-<phase>.png
    python render.py                       seamless 1080p loops    -> apps/tv/assets/sky/<phase>.mp4 + poster .jpg
    python render.py --uhd                 also 4K HEVC loops      -> out/uhd/<phase>.mp4 (served from the CDN)
    python render.py --phase night         only one phase

Frames are rendered at 4K and downscaled (supersampling), then encoded with ffmpeg.
Everything is procedural (no photos or stock footage), so every pixel is original.

On Optimus laptops SHIM_MCCOMPAT=0x800000001 makes Windows pick the discrete GPU.
"""
from __future__ import annotations

import argparse
import os
import subprocess
import sys
import time
from pathlib import Path

os.environ.setdefault("SHIM_MCCOMPAT", "0x800000001")

import imageio_ffmpeg  # noqa: E402
import moderngl  # noqa: E402

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()

# Art direction per time of day. The sun/moon sits top-right so menus on the left stay readable.
PHASES: dict[str, dict] = {
    "sunrise": dict(
        uBodyScreen=(0.745, 0.6), uNight=0, uExposure=0.5, uCoverage=0.26, uCloudDensity=1.0, uCirrus=0.55,
        uStars=0.0, uHaze=1.15, uMist=0.55, uGrade=(1.0, 0.99, 1.02), uSaturation=1.02, uWind=3.2, uSeed=3.0,
        uBodyRadius=2.6, uFireflies=0.0, uMaxOut=0.93,
    ),
    "day": dict(
        uBodyScreen=(0.78, 0.2), uNight=0, uExposure=0.42, uCoverage=0.2, uCloudDensity=1.0, uCirrus=0.05,
        uStars=0.0, uHaze=0.45, uMist=0.0, uGrade=(0.98, 1.0, 1.03), uSaturation=1.06, uWind=3.5, uSeed=11.0,
        uBodyRadius=2.4, uFireflies=0.0, uMaxOut=0.9,
    ),
    "sunset": dict(
        uBodyScreen=(0.755, 0.585), uNight=0, uExposure=0.42, uCoverage=0.24, uCloudDensity=1.0, uCirrus=0.6,
        uStars=0.0, uHaze=1.0, uMist=0.2, uGrade=(1.02, 0.93, 0.99), uSaturation=0.92, uWind=3.0, uSeed=23.0,
        uBodyRadius=2.8, uFireflies=0.0, uMaxOut=0.93,
    ),
    "night": dict(
        uBodyScreen=(0.77, 0.25), uNight=1, uExposure=1.35, uCoverage=0.2, uCloudDensity=0.5, uCirrus=0.25,
        uStars=1.0, uHaze=0.9, uMist=0.25, uGrade=(0.9, 0.97, 1.08), uSaturation=0.9, uWind=2.6, uSeed=42.0,
        uBodyRadius=5.6, uFireflies=0.8, uMaxOut=0.9,
    ),
}

VERTEX = """#version 430
in vec2 p;
void main() { gl_Position = vec4(p, 0., 1.); }
"""


class Renderer:
    def __init__(self, width: int, height: int):
        self.ctx = moderngl.create_standalone_context(require=430)
        self.gpu = self.ctx.info["GL_RENDERER"]
        src = (HERE / "sky.glsl").read_text(encoding="utf-8").replace("#version 300 es", "#version 430")
        t0 = time.time()
        self.prog = self.ctx.program(vertex_shader=VERTEX, fragment_shader=src)
        self.compile_s = time.time() - t0
        import struct

        vbo = self.ctx.buffer(struct.pack("6f", -1, -1, 3, -1, -1, 3))
        self.vao = self.ctx.vertex_array(self.prog, [(vbo, "2f", "p")])
        self.w, self.h = width, height
        self.fbo = self.ctx.simple_framebuffer((width, height), components=4)
        self.fbo.use()

    def set(self, name: str, value) -> None:
        if name in self.prog:
            self.prog[name].value = value

    def frame(self, t: float, strips: int = 12) -> bytes:
        self.set("uRes", (float(self.w), float(self.h)))
        self.set("uTile", (0.0, 0.0, float(self.w), float(self.h)))
        self.set("uTime", float(t))
        step = -(-self.h // strips)
        for y in range(0, self.h, step):
            # Small GPU jobs so a single draw never trips the Windows driver watchdog.
            self.ctx.scissor = (0, y, self.w, min(step, self.h - y))
            self.vao.render(moderngl.TRIANGLES)
            self.ctx.finish()
        self.ctx.scissor = None
        return self.fbo.read(components=3, alignment=1)


def ffmpeg(args: list[str]) -> subprocess.Popen:
    return subprocess.Popen([FFMPEG, "-hide_banner", "-loglevel", "error", "-y", *args], stdin=subprocess.PIPE)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--stills", action="store_true")
    ap.add_argument("--uhd", action="store_true")
    ap.add_argument("--phase")
    ap.add_argument("--fps", type=int, default=24)
    ap.add_argument("--loop", type=float, default=24)
    ap.add_argument("--fade", type=float, default=6)
    ap.add_argument("--t", type=float)
    ap.add_argument("--w", type=int, default=1920)
    ap.add_argument("--h", type=int, default=1080)
    a = ap.parse_args()

    out = HERE / "out"
    tv = ROOT / "apps" / "tv" / "assets" / "sky"
    out.mkdir(exist_ok=True)
    tv.mkdir(parents=True, exist_ok=True)

    W, H = (a.w, a.h) if a.stills else (3840, 2160)
    r = Renderer(W, H)
    print(f"GPU: {r.gpu} (shader compiled in {r.compile_s:.1f} s)")

    for name, uniforms in PHASES.items():
        if a.phase and a.phase != name:
            continue
        for k, v in {**uniforms, "uLoop": a.loop, "uFade": a.fade}.items():
            r.set(k, tuple(float(x) for x in v) if isinstance(v, tuple) else float(v))
        raw = ["-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}"]

        if a.stills:
            t0 = time.time()
            px = r.frame(a.t if a.t is not None else a.fade + 3)
            p = ffmpeg([*raw, "-i", "-", "-vf", "vflip", str(out / f"still-{name}.png")])
            p.communicate(px)
            print(f"{name}: still in {time.time() - t0:.1f} s")
            continue

        frames = round(a.loop * a.fps)
        hd = ffmpeg([
            *raw, "-r", str(a.fps), "-i", "-", "-vf", "vflip,scale=1920:1080:flags=lanczos,format=yuv420p",
            "-c:v", "libx264", "-preset", "slow", "-crf", "21", "-profile:v", "high", "-level", "4.1", "-tune", "film",
            "-g", str(a.fps * 2), "-movflags", "+faststart", "-an", str(tv / f"{name}.mp4"),
        ])
        uhd = None
        if a.uhd:
            (out / "uhd").mkdir(exist_ok=True)
            uhd = ffmpeg([
                *raw, "-r", str(a.fps), "-i", "-", "-vf", "vflip,format=yuv420p10le",
                "-c:v", "libx265", "-preset", "medium", "-crf", "21", "-tag:v", "hvc1", "-x265-params", "log-level=error",
                "-movflags", "+faststart", "-an", str(out / "uhd" / f"{name}.mp4"),
            ])
        poster = None
        t0 = time.time()
        for i in range(frames):
            px = r.frame(i / a.fps, strips=24)
            if i == round(a.fade * a.fps):
                poster = px
            hd.stdin.write(px)
            if uhd:
                uhd.stdin.write(px)
            if i % a.fps == 0:
                el = time.time() - t0
                eta = el / (i + 1) * (frames - i - 1)
                print(f"\r{name}: {i}/{frames} frames, {eta / 60:.1f} min left   ", end="", flush=True)
        for p in (hd, uhd):
            if p:
                p.stdin.close()
                p.wait()
        jpg = ffmpeg([*raw, "-i", "-", "-vf", "vflip,scale=1920:1080:flags=lanczos", "-q:v", "3", str(tv / f"{name}.jpg")])
        jpg.communicate(poster)
        print(f"\r{name}: {frames} frames in {(time.time() - t0) / 60:.1f} min" + " " * 20)


if __name__ == "__main__":
    sys.exit(main())
