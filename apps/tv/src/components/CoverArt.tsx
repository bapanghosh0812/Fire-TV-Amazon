import React, { useMemo } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

// Generative storybook landscape used as a placeholder while real
// illustrations load, and for stories that are still being woven.

function hash(str: string) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DEFAULT_PALETTE = ['#1B1850', '#6B4C9A', '#F5C66B', '#2D2466', '#140F3A'];

interface Props {
  seed: string;
  palette?: string[];
  shape?: 'wide' | 'tall';
  style?: StyleProp<ViewStyle>;
}

export function CoverArt({ seed, palette = DEFAULT_PALETTE, shape = 'wide', style }: Props) {
  const [skyTop, skyBottom, glow, landNear, landFar] = palette.length >= 5 ? palette : DEFAULT_PALETTE;
  const W = shape === 'wide' ? 160 : 100;
  const H = shape === 'wide' ? 90 : 150;

  const scene = useMemo(() => {
    const r = rng(hash(seed));
    const stars = Array.from({ length: shape === 'wide' ? 46 : 38 }, () => ({
      x: r() * W,
      y: r() * H * 0.62,
      s: 0.15 + r() * 0.55,
      o: 0.35 + r() * 0.65,
    }));
    const moon = { x: W * (0.2 + r() * 0.6), y: H * (0.16 + r() * 0.18), r: Math.min(W, H) * (0.08 + r() * 0.05) };
    const hills = [0.62, 0.72, 0.84].map((base, layer) => {
      const pts: string[] = [];
      const steps = 6;
      let prevX = 0;
      let prevY = H * base + (r() - 0.5) * 10;
      pts.push(`M0 ${prevY.toFixed(1)}`);
      for (let i = 1; i <= steps; i++) {
        const x = (W / steps) * i;
        const y = H * base + (r() - 0.5) * (14 - layer * 3);
        const cx = (prevX + x) / 2;
        pts.push(`C${cx.toFixed(1)} ${prevY.toFixed(1)} ${cx.toFixed(1)} ${y.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`);
        prevX = x;
        prevY = y;
      }
      pts.push(`L${W} ${H} L0 ${H} Z`);
      return pts.join(' ');
    });
    const threadY = H * (0.45 + r() * 0.12);
    const thread = `M-5 ${threadY + 8} C ${W * 0.25} ${threadY - 14}, ${W * 0.5} ${threadY + 18}, ${W * 0.75} ${threadY - 4} S ${W + 5} ${threadY - 10}, ${W + 5} ${threadY - 10}`;
    return { stars, moon, hills, thread };
  }, [seed, shape, W, H]);

  const id = `c${hash(seed).toString(36)}`;

  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" style={style}>
      <Defs>
        <LinearGradient id={`${id}sky`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={skyTop} />
          <Stop offset="1" stopColor={skyBottom} />
        </LinearGradient>
        <RadialGradient id={`${id}glow`} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={glow} stopOpacity={0.55} />
          <Stop offset="1" stopColor={glow} stopOpacity={0} />
        </RadialGradient>
        <LinearGradient id={`${id}fade`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0.55" stopColor="#07061A" stopOpacity={0} />
          <Stop offset="1" stopColor="#07061A" stopOpacity={0.55} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={W} height={H} fill={`url(#${id}sky)`} />
      {scene.stars.map((s, i) => (
        <Circle key={i} cx={s.x} cy={s.y} r={s.s} fill="#FFF6DD" opacity={s.o} />
      ))}
      <Circle cx={scene.moon.x} cy={scene.moon.y} r={scene.moon.r * 3.2} fill={`url(#${id}glow)`} />
      <Circle cx={scene.moon.x} cy={scene.moon.y} r={scene.moon.r} fill={glow} />
      <Path d={scene.thread} stroke={glow} strokeWidth={0.7} strokeOpacity={0.7} fill="none" strokeDasharray="0.1 2.2" strokeLinecap="round" />
      <Path d={scene.hills[0]} fill={landFar} opacity={0.75} />
      <Path d={scene.hills[1]} fill={landNear} opacity={0.9} />
      <Path d={scene.hills[2]} fill={landFar} />
      <Rect x={0} y={0} width={W} height={H} fill={`url(#${id}fade)`} />
    </Svg>
  );
}
