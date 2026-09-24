import React, { forwardRef } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { SpatialNavigationNodeRef } from 'react-tv-space-navigation';
import { Focusable } from './Focusable';
import { T } from './Typography';
import { Icon, IconName } from './Icon';
import { colors, px, radius } from '../theme/tokens';

interface Props {
  label: string;
  icon?: IconName;
  kind?: 'primary' | 'ghost' | 'quiet';
  onSelect?: () => void;
  onFocus?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  size?: 'md' | 'lg';
}

export const Button = forwardRef<SpatialNavigationNodeRef, Props>(function Button(
  { label, icon, kind = 'primary', onSelect, onFocus, disabled, style, size = 'md' },
  ref,
) {
  return (
    <Focusable
      ref={ref}
      onSelect={disabled ? undefined : onSelect}
      onFocus={onFocus}
      radius={radius.pill}
      scale={1.06}
      style={style}
    >
      {(focused) => {
        const filled = kind === 'primary' || focused;
        const bg = disabled
          ? colors.surface
          : focused
            ? kind === 'primary'
              ? colors.goldBright
              : colors.parchment
            : kind === 'primary'
              ? colors.gold
              : kind === 'ghost'
                ? 'rgba(247,241,227,0.10)'
                : 'transparent';
        const fg = disabled ? colors.dim : filled ? colors.night : colors.parchment;
        return (
          <View
            style={[
              styles.base,
              size === 'lg' && styles.lg,
              { backgroundColor: bg },
              kind === 'ghost' && !focused && styles.ghostBorder,
            ]}
          >
            {icon ? <Icon name={icon} size={size === 'lg' ? px(34) : px(28)} color={fg} /> : null}
            <T variant="bodyStrong" color={fg} style={size === 'lg' ? styles.lgText : undefined}>
              {label}
            </T>
          </View>
        );
      }}
    </Focusable>
  );
});

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: px(14),
    paddingHorizontal: px(40),
    height: px(76),
    borderRadius: radius.pill,
  },
  lg: {
    height: px(88),
    paddingHorizontal: px(52),
  },
  lgText: {
    fontSize: px(32),
  },
  ghostBorder: {
    borderWidth: px(2),
    borderColor: 'rgba(247,241,227,0.28)',
  },
});
