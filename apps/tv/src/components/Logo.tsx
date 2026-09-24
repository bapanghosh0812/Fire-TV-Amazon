import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { T } from './Typography';
import { colors, fonts, px } from '../theme/tokens';

export function LogoMark({ size = px(64) }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <LinearGradient id="lm" x1="0" y1="1" x2="1" y2="0">
          <Stop offset="0" stopColor={colors.goldDeep} />
          <Stop offset="1" stopColor={colors.goldBright} />
        </LinearGradient>
      </Defs>
      <Path d="M8 46c9-5 17-5 24 0V19c-7-6-15-6-24-1z" fill="rgba(245,198,107,0.12)" stroke="url(#lm)" strokeWidth={2.6} strokeLinejoin="round" />
      <Path d="M56 46c-9-5-17-5-24 0V19c7-6 15-6 24-1z" fill="rgba(245,198,107,0.12)" stroke="url(#lm)" strokeWidth={2.6} strokeLinejoin="round" />
      <Path d="M5 57c11-3 17-13 22-21s12-16 22-22" stroke={colors.coral} strokeWidth={2.6} fill="none" strokeLinecap="round" />
      <Path d="M5 60c13-2 21-11 27-20s11-15 20-19" stroke={colors.teal} strokeWidth={2.2} fill="none" strokeLinecap="round" opacity={0.9} />
      <Path d="M54 4c.5 3.6 2.4 5.5 6 6-3.6.5-5.5 2.4-6 6-.5-3.6-2.4-5.5-6-6 3.6-.5 5.5-2.4 6-6z" fill={colors.goldBright} />
    </Svg>
  );
}

export function Logo({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const mark = size === 'lg' ? px(120) : px(58);
  const fontSize = size === 'lg' ? px(104) : px(44);
  return (
    <View style={styles.row}>
      <LogoMark size={mark} />
      <T style={{ fontFamily: fonts.displayBold, fontSize, lineHeight: fontSize * 1.15, color: colors.parchment }}>
        Story
        <T style={{ fontFamily: fonts.displayItalic, fontSize, lineHeight: fontSize * 1.15, color: colors.gold }}>loom</T>
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: px(16) },
});
