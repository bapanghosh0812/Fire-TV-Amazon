import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';
import { colors, type } from '../theme/tokens';

type Variant = keyof typeof type;

interface Props extends TextProps {
  variant?: Variant;
  color?: string;
  align?: TextStyle['textAlign'];
}

export function T({ variant = 'body', color = colors.parchment, align, style, ...rest }: Props) {
  return <Text {...rest} style={[type[variant], { color, textAlign: align }, style]} />;
}
