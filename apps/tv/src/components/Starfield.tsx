import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

// Slowly drifting night sky that sits behind every screen.
export function Starfield({ density = 90, drift = true }: { density?: number; drift?: boolean }) {
  const { width, height } = useWindowDimensions();
  const x = useRef(new Animated.Value(0)).current;

  const stars = useMemo(() => {
    let seed = 42;
    const r = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    return Array.from({ length: density }, () => ({
      cx: r() * width * 1.2,
      cy: r() * height,
      r: 0.6 + r() * 1.8,
      o: 0.15 + r() * 0.6,
    }));
  }, [density, width, height]);

  useEffect(() => {
    if (!drift) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(x, { toValue: -width * 0.1, duration: 60000, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(x, { toValue: 0, duration: 60000, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [drift, width, x]);

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { width: width * 1.2, transform: [{ translateX: x }] }]}>
      <Svg width={width * 1.2} height={height}>
        {stars.map((s, i) => (
          <Circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill="#FFF6DD" opacity={s.o} />
        ))}
      </Svg>
    </Animated.View>
  );
}
