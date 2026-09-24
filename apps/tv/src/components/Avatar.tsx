import React from 'react';
import { StyleSheet, View } from 'react-native';
import { T } from './Typography';
import { colors, fonts, px } from '../theme/tokens';

interface Props {
  name: string;
  color: string;
  size?: number;
}

export function Avatar({ name, color, size = px(56) }: Props) {
  return (
    <View
      style={[
        styles.ring,
        { width: size, height: size, borderRadius: size / 2, borderColor: color, backgroundColor: `${color}33` },
      ]}
    >
      <T style={{ fontFamily: fonts.bodyBlack, fontSize: size * 0.42, lineHeight: size * 0.52, color: colors.parchment }}>
        {name.slice(0, 1).toUpperCase()}
      </T>
    </View>
  );
}

export function AvatarStack({ people, size = px(48) }: { people: { name: string; color: string }[]; size?: number }) {
  return (
    <View style={{ flexDirection: 'row' }}>
      {people.map((p, i) => (
        <View key={`${p.name}-${i}`} style={{ marginLeft: i === 0 ? 0 : -size * 0.28 }}>
          <Avatar name={p.name} color={p.color} size={size} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    borderWidth: px(3),
    alignItems: 'center',
    justifyContent: 'center',
  },
});
