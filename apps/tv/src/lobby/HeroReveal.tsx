import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Icon } from '../components/Icon';
import { colors, px } from '../theme/tokens';

const native = Platform.OS !== 'web';

/**
 * The "drawing comes alive" moment: the child's photo shimmers while the
 * illustrator works, then the painted hero blooms in on top of it.
 */
export function HeroReveal({ drawingUrl, portraitUrl }: { drawingUrl: string; portraitUrl?: string }) {
  const shimmer = useRef(new Animated.Value(0)).current;
  const bloom = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmer, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: native }),
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  useEffect(() => {
    if (!portraitUrl) return;
    Animated.timing(bloom, { toValue: 1, duration: 1400, easing: Easing.out(Easing.cubic), useNativeDriver: native }).start();
  }, [portraitUrl, bloom]);

  const sparkleOpacity = shimmer.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.2, 1, 0.2] });
  const bloomScale = bloom.interpolate({ inputRange: [0, 1], outputRange: [1.25, 1] });

  return (
    <View style={StyleSheet.absoluteFill}>
      <Image source={{ uri: drawingUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
      {!portraitUrl ? (
        <Animated.View style={[StyleSheet.absoluteFill, styles.center, { opacity: sparkleOpacity, backgroundColor: 'rgba(7,6,26,0.35)' }]}>
          <Icon name="sparkle" size={px(46)} color={colors.goldBright} />
        </Animated.View>
      ) : (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: bloom, transform: [{ scale: bloomScale }] }]}>
          <Image source={{ uri: portraitUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
