import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Focusable } from './Focusable';
import { Icon, IconName } from './Icon';
import { T } from './Typography';
import { colors, px, radius } from '../theme/tokens';

interface Props {
  label: string;
  icon?: IconName;
  selected?: boolean;
  onSelect?: () => void;
  onFocus?: () => void;
}

/** Toggle chip for settings like mood and length. */
export function Pill({ label, icon, selected, onSelect, onFocus }: Props) {
  return (
    <Focusable onSelect={onSelect} onFocus={onFocus} radius={radius.pill} scale={1.08}>
      {(focused) => {
        const bg = focused ? colors.parchment : selected ? colors.gold : 'rgba(247,241,227,0.08)';
        const fg = focused || selected ? colors.night : colors.parchment;
        return (
          <View style={[styles.pill, { backgroundColor: bg }, !selected && !focused && styles.border]}>
            {icon ? <Icon name={icon} size={px(24)} color={fg} /> : null}
            <T variant="bodyStrong" color={fg} style={{ fontSize: px(24) }}>
              {label}
            </T>
          </View>
        );
      }}
    </Focusable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: px(10),
    height: px(58),
    paddingHorizontal: px(26),
    borderRadius: radius.pill,
  },
  border: { borderWidth: px(1.5), borderColor: colors.line },
});
