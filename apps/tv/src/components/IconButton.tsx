import React, { forwardRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { SpatialNavigationNodeRef } from 'react-tv-space-navigation';
import { Focusable } from './Focusable';
import { Icon, type IconName } from './Icon';
import { T } from './Typography';
import { sfx } from '../audio/director';
import { colors, px } from '../theme/tokens';

interface Props {
  icon: IconName;
  label: string;
  onSelect: () => void;
  size?: 'md' | 'lg';
  active?: boolean;
  showLabel?: 'focus' | 'always' | 'never';
}

/** Round glass button with a label that appears when focused (streaming-app transport style). */
export const IconButton = forwardRef<SpatialNavigationNodeRef, Props>(function IconButton(
  { icon, label, onSelect, size = 'md', active, showLabel = 'focus' },
  ref,
) {
  const d = size === 'lg' ? px(104) : px(76);
  const [hasFocus, setHasFocus] = useState(false);
  // The label lives outside the focus frame (which clips its content to the circle).
  return (
    <View style={styles.wrap} accessibilityLabel={label}>
      <Focusable
        ref={ref}
        onSelect={() => {
          sfx('select');
          onSelect();
        }}
        onFocus={() => setHasFocus(true)}
        onBlur={() => setHasFocus(false)}
        radius={d / 2}
        scale={1.12}
      >
        {(focused) => (
          <View
            style={[
              styles.circle,
              { width: d, height: d, borderRadius: d / 2 },
              size === 'lg' && styles.primary,
              active && styles.active,
              focused && styles.focused,
            ]}
          >
            <Icon name={icon} size={size === 'lg' ? px(46) : px(34)} color={focused || size === 'lg' ? colors.night : colors.parchment} strokeWidth={2.2} />
          </View>
        )}
      </Focusable>
      {showLabel === 'always' || (showLabel === 'focus' && hasFocus) ? (
        <View style={[styles.label, { left: (d - LABEL_W) / 2 }]} pointerEvents="none">
          <T variant="caption" color={colors.parchment} numberOfLines={1} style={styles.labelText}>
            {label}
          </T>
        </View>
      ) : null}
    </View>
  );
});

const LABEL_W = px(360);

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(247,241,227,0.12)',
    borderWidth: px(1.5),
    borderColor: 'rgba(247,241,227,0.22)',
  },
  primary: { backgroundColor: colors.gold, borderColor: colors.goldBright },
  active: { borderColor: colors.gold },
  focused: { backgroundColor: colors.parchment, borderColor: colors.parchment },
  label: {
    position: 'absolute',
    top: '100%',
    marginTop: px(18),
    paddingVertical: px(4),
    width: LABEL_W,
    alignItems: 'center',
  },
  labelText: {
    letterSpacing: 0,
    backgroundColor: 'rgba(7,6,26,0.85)',
    paddingHorizontal: px(14),
    paddingVertical: px(3),
    borderRadius: px(10),
    overflow: 'hidden',
  },
});
