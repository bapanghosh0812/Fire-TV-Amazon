import React, { forwardRef, useEffect, useRef } from 'react';
import { Animated, Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { SpatialNavigationFocusableView, SpatialNavigationNodeRef } from 'react-tv-space-navigation';
import { colors, motion, px, radius as radii } from '../theme/tokens';

const useNative = Platform.OS !== 'web';

interface FrameProps {
  focused: boolean;
  radius?: number;
  scale?: number;
  ringColor?: string;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

/** Animated focus treatment: lift, gold ring and a soft halo. */
export function FocusFrame({
  focused,
  radius = radii.md,
  scale = motion.focusScale,
  ringColor = colors.gold,
  style,
  children,
}: FrameProps) {
  const progress = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(progress, {
      toValue: focused ? 1 : 0,
      useNativeDriver: useNative,
      speed: 22,
      bounciness: 6,
    }).start();
  }, [focused, progress]);

  const animatedScale = progress.interpolate({ inputRange: [0, 1], outputRange: [1, scale] });

  return (
    <Animated.View style={[style, { transform: [{ scale: animatedScale }], zIndex: focused ? 10 : 0 }]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.halo,
          { borderRadius: radius + px(14), borderColor: ringColor, opacity: Animated.multiply(progress, 0.28) },
        ]}
      />
      <View style={{ borderRadius: radius, overflow: 'hidden' }}>{children}</View>
      <Animated.View
        pointerEvents="none"
        style={[styles.ring, { borderRadius: radius + px(6), borderColor: ringColor, opacity: progress }]}
      />
    </Animated.View>
  );
}

interface FocusableProps {
  onSelect?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  style?: StyleProp<ViewStyle>;
  frameStyle?: StyleProp<ViewStyle>;
  radius?: number;
  scale?: number;
  ringColor?: string;
  children: (focused: boolean) => React.ReactNode;
}

export const Focusable = forwardRef<SpatialNavigationNodeRef, FocusableProps>(function Focusable(
  { onSelect, onFocus, onBlur, style, frameStyle, radius, scale, ringColor, children },
  ref,
) {
  return (
    <SpatialNavigationFocusableView
      ref={ref}
      onSelect={onSelect}
      onFocus={onFocus}
      onBlur={onBlur}
      style={style as ViewStyle}
      viewProps={{ accessible: true, accessibilityRole: 'button' }}
    >
      {({ isFocused }) => (
        <FocusFrame focused={isFocused} radius={radius} scale={scale} ringColor={ringColor} style={frameStyle}>
          {children(isFocused)}
        </FocusFrame>
      )}
    </SpatialNavigationFocusableView>
  );
});

const styles = StyleSheet.create({
  ring: {
    position: 'absolute',
    top: -px(6),
    left: -px(6),
    right: -px(6),
    bottom: -px(6),
    borderWidth: px(4),
  },
  halo: {
    position: 'absolute',
    top: -px(14),
    left: -px(14),
    right: -px(14),
    bottom: -px(14),
    borderWidth: px(10),
  },
});
