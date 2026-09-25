import React, { memo, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';

const native = Platform.OS !== 'web';
const TINT: Record<string, string> = { cozy: '#FFE3A3', adventure: '#FFD27A', silly: '#FFB3C7', curious: '#A8F0FF' };

function rng(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

/** Slow floating motes of light over the illustration, so every page feels alive (like a film). */
export const Motes = memo(function Motes({ mood, count = 18 }: { mood?: string; count?: number }) {
  const { width: W, height: H } = useWindowDimensions();
  const color = TINT[mood ?? 'cozy'] ?? TINT.cozy;
  const specs = useMemo(() => {
    const r = rng(7);
    return Array.from({ length: count }, () => ({
      x: r() * W,
      y: H * (0.2 + r() * 0.8),
      size: 3 + r() * 7,
      rise: H * (0.12 + r() * 0.25),
      sway: (r() - 0.5) * 80,
      duration: 9000 + r() * 9000,
      delay: r() * 8000,
    }));
  }, [W, H, count]);
  const values = useRef(specs.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const loops = values.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(specs[i].delay),
          Animated.timing(v, { toValue: 1, duration: specs[i].duration, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
          Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: native }),
        ]),
      ),
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [values, specs]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {specs.map((s, i) => {
        const v = values[i];
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: s.x,
              top: s.y,
              width: s.size,
              height: s.size,
              borderRadius: s.size / 2,
              backgroundColor: color,
              shadowColor: color,
              shadowOpacity: 0.9,
              shadowRadius: s.size * 2,
              opacity: v.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 0.75, 0.55, 0] }),
              transform: [
                { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -s.rise] }) },
                { translateX: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, s.sway, 0] }) },
              ],
            }}
          />
        );
      })}
    </View>
  );
});
