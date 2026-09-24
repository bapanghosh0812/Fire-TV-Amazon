import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet } from 'react-native';

/** Slow cinematic push-in on each illustration. */
export function KenBurns({ pageKey, durationMs, direction, children }: { pageKey: string; durationMs: number; direction: 1 | -1; children: React.ReactNode }) {
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    t.setValue(0);
    const anim = Animated.timing(t, {
      toValue: 1,
      duration: Math.max(8000, durationMs + 4000),
      easing: Easing.out(Easing.quad),
      useNativeDriver: Platform.OS !== 'web',
    });
    anim.start();
    return () => anim.stop();
  }, [pageKey, durationMs, t]);

  const scale = t.interpolate({ inputRange: [0, 1], outputRange: [1.02, 1.12] });
  const translateX = t.interpolate({ inputRange: [0, 1], outputRange: [0, 28 * direction] });

  return <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale }, { translateX }] }]}>{children}</Animated.View>;
}
