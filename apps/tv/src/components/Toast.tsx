import React, { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import { useToast } from '../state/toast';
import { T } from './Typography';
import { Icon } from './Icon';
import { colors, px, radius, safe } from '../theme/tokens';

/** Gentle notification pill, e.g. "Mom joined the story". */
export function Toast() {
  const { message, color, id } = useToast();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, { toValue: message ? 1 : 0, useNativeDriver: Platform.OS !== 'web', speed: 16, bounciness: 6 }).start();
  }, [message, id, anim]);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [-px(40), 0] });

  return (
    <Animated.View pointerEvents="none" style={[styles.wrap, { opacity: anim, transform: [{ translateY }] }]}>
      {message ? (
        <View style={styles.pill}>
          <View style={[styles.dot, { backgroundColor: color ?? colors.gold }]}>
            <Icon name="sparkle" size={px(20)} color={colors.night} />
          </View>
          <T variant="bodyStrong">{message}</T>
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: safe.y, right: safe.x, zIndex: 100 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: px(14),
    paddingLeft: px(10),
    paddingRight: px(28),
    height: px(68),
    borderRadius: radius.pill,
    backgroundColor: 'rgba(34,30,75,0.96)',
    borderWidth: px(1.5),
    borderColor: 'rgba(245,198,107,0.35)',
  },
  dot: { width: px(48), height: px(48), borderRadius: px(24), alignItems: 'center', justifyContent: 'center' },
});
