import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient as SvgLinear, Path, RadialGradient, Stop } from 'react-native-svg';
import { THEMES, SkyPhase } from './phases';

const native = Platform.OS !== 'web';

// Seeded random so the sky is identical on every screen (no jumping stars).
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

/**
 * The illustrated sky (and the low-power fallback for the cinematic one): a glowing sun
 * by day, a detailed moon and stars by night, drifting clouds and layered mountains.
 * Everything is vector, so it stays sharp on 4K TVs.
 */
export function VectorSky({ phase }: { phase: SkyPhase }) {
  const theme = THEMES[phase];
  const { width: W, height: H } = useWindowDimensions();
  const fade = useRef(new Animated.Value(1)).current;
  const prev = useRef(phase);

  // Cross-fade when the phase changes (e.g. at sunset).
  useEffect(() => {
    if (prev.current === phase) return;
    prev.current = phase;
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 2500, useNativeDriver: native }).start();
  }, [phase, fade]);

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: fade }]}>
      <LinearGradient colors={theme.sky} locations={[0, 0.38, 0.72, 1]} style={StyleSheet.absoluteFill} />
      {theme.stars > 0 ? <Stars W={W} H={H} visibility={theme.stars} milkyWay={phase === 'night'} /> : null}
      <Horizon W={W} H={H} color={theme.haze} />
      <CelestialBody W={W} H={H} phase={phase} />
      {theme.clouds > 0 ? <Clouds W={W} H={H} tint={theme.cloudTint} opacity={theme.clouds} /> : null}
      <Mountains W={W} H={H} colors={theme.mountains} ground={theme.ground} haze={theme.haze} />
      {phase === 'night' ? <ShootingStars W={W} H={H} /> : null}
    </Animated.View>
  );
}

// ---------------------------------------------------------------- stars

function Stars({ W, H, visibility, milkyWay }: { W: number; H: number; visibility: number; milkyWay: boolean }) {
  const { field, bright, twinkleA, twinkleB, band } = useMemo(() => {
    const r = rng(20261023);
    const count = Math.round((W * H) / 5200); // ~400 on 1080p, scales with resolution
    const field = Array.from({ length: count }, () => {
      const y = Math.pow(r(), 1.35) * H * 0.78; // denser near the top of the sky
      return { x: r() * W, y, r: 0.35 + Math.pow(r(), 3) * 1.5, o: 0.25 + r() * 0.6 };
    });
    const bright = Array.from({ length: 14 }, () => ({ x: r() * W, y: r() * H * 0.55, r: 1.4 + r() * 1.2 }));
    const tw = () => Array.from({ length: 36 }, () => ({ x: r() * W, y: r() * H * 0.7, r: 0.8 + r() * 1.1 }));
    // Milky Way: extra faint stars along a diagonal band.
    const band = Array.from({ length: Math.round(count * 0.5) }, () => {
      const t = r();
      const off = (r() - 0.5) * H * 0.16 * (1 - Math.abs(t - 0.5));
      return { x: t * W, y: H * 0.05 + t * H * 0.38 + off, r: 0.3 + r() * 0.6, o: 0.15 + r() * 0.35 };
    });
    return { field, bright, twinkleA: tw(), twinkleB: tw(), band };
  }, [W, H]);

  const a = useRef(new Animated.Value(0.3)).current;
  const b = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = (v: Animated.Value, from: number, to: number, ms: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: to, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
          Animated.timing(v, { toValue: from, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
        ]),
      );
    const la = loop(a, 0.25, 1, 1700);
    const lb = loop(b, 1, 0.2, 2300);
    la.start();
    lb.start();
    return () => {
      la.stop();
      lb.stop();
    };
  }, [a, b]);

  return (
    <View style={[StyleSheet.absoluteFill, { opacity: visibility }]}>
      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="mw" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#8A7BD6" stopOpacity={0.22} />
            <Stop offset="0.6" stopColor="#4B4A9A" stopOpacity={0.08} />
            <Stop offset="1" stopColor="#1A1D4F" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="starGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.9} />
            <Stop offset="0.25" stopColor="#DDE6FF" stopOpacity={0.35} />
            <Stop offset="1" stopColor="#DDE6FF" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        {milkyWay ? (
          <G>
            <Ellipse cx={W * 0.5} cy={H * 0.24} rx={W * 0.62} ry={H * 0.11} fill="url(#mw)" transform={`rotate(24 ${W * 0.5} ${H * 0.24})`} />
            {band.map((s, i) => (
              <Circle key={`b${i}`} cx={s.x} cy={s.y} r={s.r} fill="#F4F0FF" opacity={s.o} />
            ))}
          </G>
        ) : null}
        {field.map((s, i) => (
          <Circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#FFF9EA" opacity={s.o} />
        ))}
        {bright.map((s, i) => (
          <G key={`g${i}`}>
            <Circle cx={s.x} cy={s.y} r={s.r * 5} fill="url(#starGlow)" />
            <Line x1={s.x - s.r * 5} y1={s.y} x2={s.x + s.r * 5} y2={s.y} stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={0.6} />
            <Line x1={s.x} y1={s.y - s.r * 5} x2={s.x} y2={s.y + s.r * 5} stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={0.6} />
            <Circle cx={s.x} cy={s.y} r={s.r} fill="#FFFFFF" />
          </G>
        ))}
      </Svg>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: a }]}>
        <Svg width={W} height={H}>
          {twinkleA.map((s, i) => (
            <Circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#FFFFFF" />
          ))}
        </Svg>
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: b }]}>
        <Svg width={W} height={H}>
          {twinkleB.map((s, i) => (
            <Circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#FFF3D6" />
          ))}
        </Svg>
      </Animated.View>
    </View>
  );
}

// ------------------------------------------------------------ sun & moon

function CelestialBody({ W, H, phase }: { W: number; H: number; phase: SkyPhase }) {
  const theme = THEMES[phase];
  const isMoon = theme.body === 'moon';
  const R = W * (isMoon ? 0.066 : phase === 'day' ? 0.07 : 0.085);
  const cx = W * 0.75;
  const cy = H * theme.bodyY;
  const pulse = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isMoon) return;
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 240000, easing: Easing.linear, useNativeDriver: native }));
    loop.start();
    return () => loop.stop();
  }, [spin, isMoon]);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  useEffect(() => {
    const p = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 4200, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
        Animated.timing(pulse, { toValue: 0, duration: 4200, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
      ]),
    );
    p.start();
    rise.setValue(0);
    Animated.timing(rise, { toValue: 1, duration: 1800, easing: Easing.out(Easing.cubic), useNativeDriver: native }).start();
    return () => p.stop();
  }, [pulse, rise, phase]);

  const glowScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  const translateY = rise.interpolate({ inputRange: [0, 1], outputRange: [H * 0.04, 0] });
  const size = R * 9;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: cx - size / 2,
        top: cy - size / 2,
        width: size,
        height: size,
        opacity: rise,
        transform: [{ translateY }],
      }}
    >
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale: glowScale }] }]}>
        <Svg width={size} height={size}>
          <Defs>
            <RadialGradient id="halo" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={isMoon ? '#DCE3FF' : phase === 'day' ? '#FFF7DA' : '#FFD2A0'} stopOpacity={isMoon ? 0.42 : 0.62} />
              <Stop offset="0.28" stopColor={isMoon ? '#9FA9E6' : phase === 'day' ? '#FFE9A8' : '#FFB070'} stopOpacity={isMoon ? 0.14 : 0.26} />
              <Stop offset="1" stopColor={isMoon ? '#3B3F80' : '#FFD27A'} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="url(#halo)" />
        </Svg>
      </Animated.View>
      {!isMoon ? (
        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate }] }]}>
          <SunRays size={size} R={R} warm={phase !== 'day'} />
        </Animated.View>
      ) : null}
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        {isMoon ? <MoonDisc c={size / 2} R={R} /> : <SunDisc c={size / 2} R={R} warm={phase !== 'day'} />}
      </Svg>
    </Animated.View>
  );
}

/** Long, soft god-rays fanning out from the sun. */
function SunRays({ size, R, warm }: { size: number; R: number; warm: boolean }) {
  const c = size / 2;
  const rays = useMemo(() => {
    const r = rng(77);
    return Array.from({ length: 14 }, (_, i) => {
      const angle = (i / 14) * Math.PI * 2 + r() * 0.2;
      const len = size * (0.36 + r() * 0.12);
      const spread = 0.035 + r() * 0.03;
      const x1 = c + Math.cos(angle - spread) * len;
      const y1 = c + Math.sin(angle - spread) * len;
      const x2 = c + Math.cos(angle + spread) * len;
      const y2 = c + Math.sin(angle + spread) * len;
      return { d: `M${c} ${c} L${x1} ${y1} L${x2} ${y2} Z`, o: 0.35 + r() * 0.4 };
    });
  }, [size, c]);
  return (
    <Svg width={size} height={size}>
      <Defs>
        <RadialGradient id="ray" cx="50%" cy="50%" r="50%">
          <Stop offset={String((R * 1.1) / (size / 2))} stopColor={warm ? '#FFD6A0' : '#FFF6D2'} stopOpacity={0.5} />
          <Stop offset="1" stopColor={warm ? '#FFB070' : '#FFF6D2'} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      {rays.map((ray, i) => (
        <Path key={i} d={ray.d} fill="url(#ray)" opacity={ray.o} />
      ))}
    </Svg>
  );
}

function SunDisc({ c, R, warm }: { c: number; R: number; warm: boolean }) {
  return (
    <G>
      <Defs>
        <RadialGradient id="corona" cx="50%" cy="50%" r="50%">
          <Stop offset="0.45" stopColor={warm ? '#FFE0B0' : '#FFFBEA'} stopOpacity={0.95} />
          <Stop offset="1" stopColor={warm ? '#FF9F5E' : '#FFE08A'} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="disc" cx="45%" cy="42%" r="60%">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="0.55" stopColor={warm ? '#FFE9C2' : '#FFF8DC'} />
          <Stop offset="1" stopColor={warm ? '#FFAE6B' : '#FFE39A'} />
        </RadialGradient>
      </Defs>
      <Circle cx={c} cy={c} r={R * 1.9} fill="url(#corona)" />
      <Circle cx={c} cy={c} r={R} fill="url(#disc)" />
    </G>
  );
}

function MoonDisc({ c, R }: { c: number; R: number }) {
  // Maria (dark "seas") and craters, placed relative to the radius.
  const maria = [
    { x: -0.28, y: -0.22, rx: 0.34, ry: 0.26, o: 0.26 },
    { x: 0.2, y: -0.3, rx: 0.22, ry: 0.18, o: 0.22 },
    { x: 0.08, y: 0.18, rx: 0.3, ry: 0.22, o: 0.2 },
    { x: -0.34, y: 0.3, rx: 0.16, ry: 0.13, o: 0.18 },
  ];
  const craters = [
    { x: 0.38, y: 0.12, r: 0.1 },
    { x: -0.05, y: -0.52, r: 0.07 },
    { x: 0.52, y: -0.28, r: 0.06 },
    { x: -0.5, y: -0.02, r: 0.08 },
    { x: 0.22, y: 0.52, r: 0.09 },
    { x: -0.18, y: 0.58, r: 0.05 },
    { x: 0.62, y: 0.3, r: 0.045 },
  ];
  return (
    <G>
      <Defs>
        <RadialGradient id="moonDisc" cx="38%" cy="36%" r="70%">
          <Stop offset="0" stopColor="#FFFEF6" />
          <Stop offset="0.55" stopColor="#ECE7D8" />
          <Stop offset="1" stopColor="#B9B3A3" />
        </RadialGradient>
        <RadialGradient id="moonShade" cx="72%" cy="74%" r="75%">
          <Stop offset="0.35" stopColor="#141633" stopOpacity={0} />
          <Stop offset="1" stopColor="#141633" stopOpacity={0.42} />
        </RadialGradient>
        <RadialGradient id="crater" cx="42%" cy="40%" r="55%">
          <Stop offset="0" stopColor="#8E897C" stopOpacity={0.45} />
          <Stop offset="0.75" stopColor="#A7A293" stopOpacity={0.25} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0.3} />
        </RadialGradient>
        <RadialGradient id="mare" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#8A8574" stopOpacity={0.55} />
          <Stop offset="0.65" stopColor="#8F8A79" stopOpacity={0.32} />
          <Stop offset="1" stopColor="#9C9786" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={c} cy={c} r={R} fill="url(#moonDisc)" />
      {maria.map((m, i) => (
        <Ellipse key={i} cx={c + m.x * R} cy={c + m.y * R} rx={m.rx * R * 1.25} ry={m.ry * R * 1.25} fill="url(#mare)" opacity={m.o * 2.4} />
      ))}
      {craters.map((k, i) => (
        <Circle key={`c${i}`} cx={c + k.x * R} cy={c + k.y * R} r={k.r * R} fill="url(#crater)" />
      ))}
      <Circle cx={c} cy={c} r={R} fill="url(#moonShade)" />
      <Circle cx={c} cy={c} r={R - 0.75} fill="none" stroke="#FFFFFF" strokeOpacity={0.3} strokeWidth={1.5} />
    </G>
  );
}

// ----------------------------------------------------------------- clouds

const PUFFS = [
  [0, 0, 1],
  [0.62, -0.32, 1.15],
  [1.3, -0.05, 0.95],
  [-0.62, 0.12, 0.8],
  [1.95, 0.16, 0.7],
  [0.55, 0.22, 1.05],
  [-1.15, 0.26, 0.55],
];

function Clouds({ W, H, tint, opacity }: { W: number; H: number; tint: [string, string]; opacity: number }) {
  // Placed away from the top-right controls and the sun/moon; the left side is
  // under the text scrim, so clouds there stay soft and never fight the words.
  const groups = useMemo(
    () => [
      { x: W * 0.56, y: H * 0.13, s: W * 0.034, drift: W * 0.03, ms: 38000, o: 0.9 },
      { x: W * 0.9, y: H * 0.44, s: W * 0.03, drift: W * 0.025, ms: 46000, o: 0.8 },
      { x: W * 0.64, y: H * 0.4, s: W * 0.042, drift: W * 0.035, ms: 52000, o: 0.7 },
      { x: W * 0.28, y: H * 0.1, s: W * 0.03, drift: W * 0.02, ms: 60000, o: 0.45 },
    ],
    [W, H],
  );
  return (
    <View style={[StyleSheet.absoluteFill, { opacity }]}>
      {groups.map((g, i) => (
        <Cloud key={i} {...g} tint={tint} />
      ))}
    </View>
  );
}

function Cloud({ x, y, s, drift, ms, o, tint }: { x: number; y: number; s: number; drift: number; ms: number; o: number; tint: [string, string] }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
        Animated.timing(v, { toValue: 0, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v, ms]);
  const translateX = v.interpolate({ inputRange: [0, 1], outputRange: [-drift, drift] });
  // Canvas with room on every side so no puff is ever clipped.
  const w = s * 6.4;
  const h = s * 3.8;
  const id = `cl${Math.round(x)}${Math.round(y)}`;
  return (
    <Animated.View style={{ position: 'absolute', left: x - w / 2, top: y - h / 2, width: w, height: h, opacity: o, transform: [{ translateX }] }}>
      <Svg width={w} height={h}>
        <Defs>
          <RadialGradient id={`${id}l`} cx="45%" cy="40%" r="55%">
            <Stop offset="0" stopColor={tint[0]} stopOpacity={0.95} />
            <Stop offset="0.7" stopColor={tint[0]} stopOpacity={0.55} />
            <Stop offset="1" stopColor={tint[0]} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={`${id}s`} cx="50%" cy="60%" r="55%">
            <Stop offset="0" stopColor={tint[1]} stopOpacity={0.7} />
            <Stop offset="1" stopColor={tint[1]} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        {PUFFS.map(([px, py, pr], i) => (
          <Circle key={`s${i}`} cx={w * 0.36 + px * s} cy={h * 0.56 + py * s + s * 0.28} r={pr * s} fill={`url(#${id}s)`} />
        ))}
        {PUFFS.map(([px, py, pr], i) => (
          <Circle key={`l${i}`} cx={w * 0.36 + px * s} cy={h * 0.5 + py * s} r={pr * s} fill={`url(#${id}l)`} />
        ))}
      </Svg>
    </Animated.View>
  );
}

// -------------------------------------------------------------- mountains

function ridge(W: number, H: number, base: number, amp: number, seed: number, steps = 28) {
  const r = rng(seed);
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const x = (W * 1.1 * i) / steps - W * 0.05;
    const n = Math.sin(i * 0.55 + seed) * 0.5 + Math.sin(i * 1.7 + seed * 2) * 0.25 + (r() - 0.5) * 0.5;
    pts.push([x, H * base - n * amp]);
  }
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const mx = (x0 + x1) / 2;
    d += ` Q${x0} ${y0} ${mx} ${(y0 + y1) / 2}`;
  }
  d += ` L${W * 1.1} ${H} L${-W * 0.1} ${H} Z`;
  return d;
}

function Mountains({ W, H, colors, ground, haze }: { W: number; H: number; colors: [string, string, string]; ground: string; haze: string }) {
  const paths = useMemo(
    () => ({
      far: ridge(W, H, 0.7, H * 0.13, 7),
      mid: ridge(W, H, 0.79, H * 0.08, 19),
      near: ridge(W, H, 0.88, H * 0.05, 31),
    }),
    [W, H],
  );
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 30000, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
        Animated.timing(v, { toValue: 0, duration: 30000, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v]);
  // Parallax: nearer layers drift further — reads as depth on a big screen.
  const layer = (d: number) => ({ transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [-d, d] }) }] });
  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, layer(W * 0.004)]}>
        <Svg width={W} height={H}>
          <Path d={paths.far} fill={colors[0]} opacity={0.85} />
        </Svg>
      </Animated.View>
      <LinearGradient colors={['rgba(0,0,0,0)', haze, 'rgba(0,0,0,0)']} locations={[0.55, 0.72, 0.9]} style={[StyleSheet.absoluteFill, { opacity: 0.55 }]} />
      <Animated.View style={[StyleSheet.absoluteFill, layer(W * 0.008)]}>
        <Svg width={W} height={H}>
          <Path d={paths.mid} fill={colors[1]} />
        </Svg>
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, layer(W * 0.014)]}>
        <Svg width={W} height={H}>
          <Defs>
            <SvgLinear id="near" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0.8" stopColor={colors[2]} />
              <Stop offset="1" stopColor={ground} />
            </SvgLinear>
          </Defs>
          <Path d={paths.near} fill="url(#near)" />
        </Svg>
      </Animated.View>
    </View>
  );
}

function Horizon({ W, H, color }: { W: number; H: number; color: string }) {
  return (
    <LinearGradient
      colors={['rgba(0,0,0,0)', color, 'rgba(0,0,0,0)']}
      locations={[0.4, 0.68, 0.85]}
      style={[StyleSheet.absoluteFill, { width: W, height: H }]}
    />
  );
}

// ---------------------------------------------------------- shooting stars

function ShootingStars({ W, H }: { W: number; H: number }) {
  const t = useRef(new Animated.Value(0)).current;
  const [start, setStart] = useState({ x: W * 0.2, y: H * 0.1 });

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const fire = () => {
      if (!alive) return;
      setStart({ x: W * (0.1 + Math.random() * 0.5), y: H * (0.05 + Math.random() * 0.2) });
      t.setValue(0);
      Animated.timing(t, { toValue: 1, duration: 1100, easing: Easing.out(Easing.quad), useNativeDriver: native }).start(() => {
        timer = setTimeout(fire, 7000 + Math.random() * 9000);
      });
    };
    timer = setTimeout(fire, 3500);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [t, W, H]);

  const len = W * 0.12;
  const translateX = t.interpolate({ inputRange: [0, 1], outputRange: [0, W * 0.28] });
  const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [0, H * 0.18] });
  const opacity = t.interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0, 1, 0.8, 0] });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: start.x,
        top: start.y,
        width: len,
        height: 2,
        opacity,
        transform: [{ translateX }, { translateY }, { rotate: '32deg' }],
      }}
    >
      <LinearGradient colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.95)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
    </Animated.View>
  );
}
