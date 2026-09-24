import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';
import { useSettings } from '../state/settings';
import { colors, type } from '../theme/tokens';

type Variant = keyof typeof type;

interface Props extends TextProps {
  variant?: Variant;
  color?: string;
  align?: TextStyle['textAlign'];
}

// Devanagari's headline, Arabic joins and CJK break when letter-spaced.
const NO_TRACKING = /^(hi|ar|ja|ko|cmn|zh)/;

export function T({ variant = 'body', color = colors.parchment, align, style, ...rest }: Props) {
  const language = useSettings((s) => s.language);
  const untracked = NO_TRACKING.test(language) ? { letterSpacing: 0 } : null;
  return <Text {...rest} style={[type[variant], { color, textAlign: align }, style, untracked]} />;
}
