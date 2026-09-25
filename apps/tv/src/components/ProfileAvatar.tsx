import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { T } from './Typography';
import { px } from '../theme/tokens';

export const AVATARS: Record<string, { emoji: string; colors: [string, string] }> = {
  fox: { emoji: '🦊', colors: ['#FF9A6B', '#B8452E'] },
  owl: { emoji: '🦉', colors: ['#A58BFF', '#4B3A9A'] },
  deer: { emoji: '🦌', colors: ['#F3C98B', '#9A6232'] },
  bear: { emoji: '🐻', colors: ['#D9A273', '#6E4526'] },
  whale: { emoji: '🐳', colors: ['#6FD3FF', '#1F5E9A'] },
  dragon: { emoji: '🐉', colors: ['#7BE8A8', '#1E7A55'] },
  cat: { emoji: '🐱', colors: ['#FFD27A', '#B07A1E'] },
  rabbit: { emoji: '🐰', colors: ['#FFC4DA', '#A6537A'] },
  grownup: { emoji: '⭐', colors: ['#F5C66B', '#7A5A1E'] },
};

/** A round, glowing profile picture (friendly animals for kids, a star for grown-ups). */
export function ProfileAvatar({ avatar, size = px(160), ring }: { avatar: string; size?: number; ring?: string }) {
  const a = AVATARS[avatar] ?? AVATARS.fox;
  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 2, borderColor: ring ?? 'rgba(247,241,227,0.25)' }]}>
      <LinearGradient colors={a.colors} start={{ x: 0.2, y: 0 }} end={{ x: 0.9, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: size / 2 }]} />
      <T style={{ fontSize: size * 0.5, lineHeight: size * 0.62 }}>{a.emoji}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: px(4) },
});
