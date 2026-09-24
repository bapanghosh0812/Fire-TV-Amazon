import React, { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { DefaultFocus, SpatialNavigationRoot, SpatialNavigationView } from 'react-tv-space-navigation';
import { LANGUAGES } from '@storyloom/protocol';
import { Focusable } from './Focusable';
import { Icon } from './Icon';
import { T } from './Typography';
import { useBackHandler } from '../remote/hooks';
import { useT } from '../i18n';
import { colors, px, radius, safe } from '../theme/tokens';

const native = Platform.OS !== 'web';
const PER_ROW = 5;

interface Props {
  selected?: string;
  onPick: (code: string) => void;
  onClose: () => void;
}

/** Every language shown in its own script, so each family finds theirs at a glance. */
export function LanguageSheet({ selected, onPick, onClose }: Props) {
  const t = useT();
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(slide, { toValue: 1, useNativeDriver: native, speed: 16, bounciness: 4 }).start();
  }, [slide]);

  useBackHandler(() => {
    onClose();
    return true;
  });

  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [px(460), 0] });
  const rows = Array.from({ length: Math.ceil(LANGUAGES.length / PER_ROW) }, (_, r) => LANGUAGES.slice(r * PER_ROW, (r + 1) * PER_ROW));

  return (
    <SpatialNavigationRoot isActive>
      <View style={StyleSheet.absoluteFill}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim, opacity: slide }]} />
        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          <LinearGradient colors={[colors.surface, colors.ink]} style={StyleSheet.absoluteFill} />
          <View style={styles.head}>
            <T variant="h1">{t('picker.language.title')}</T>
            <T variant="body" color={colors.muted}>
              {t('picker.language.hint')}
            </T>
          </View>
          <SpatialNavigationView direction="vertical" style={styles.grid}>
            {rows.map((row, r) => (
              <SpatialNavigationView key={r} direction="horizontal" style={styles.row}>
                {row.map((lang) => {
                  const isSelected = lang.code === selected;
                  const card = (
                    <Focusable key={lang.code} onSelect={() => onPick(lang.code)} radius={radius.md} scale={1.08}>
                      {(focused) => (
                        <View style={[styles.card, isSelected && styles.cardSelected, focused && styles.cardFocused]}>
                          <T variant="h3" color={focused ? colors.night : colors.parchment} numberOfLines={1} style={{ fontSize: px(28) }}>
                            {lang.native}
                          </T>
                          <View style={styles.cardFoot}>
                            <T variant="caption" color={focused ? colors.night : colors.dim} numberOfLines={1} style={{ letterSpacing: 0, fontSize: px(18) }}>
                              {lang.english}
                            </T>
                            {isSelected ? <Icon name="check" size={px(22)} color={focused ? colors.night : colors.gold} strokeWidth={3} /> : null}
                          </View>
                        </View>
                      )}
                    </Focusable>
                  );
                  return isSelected ? <DefaultFocus key={lang.code}>{card}</DefaultFocus> : card;
                })}
              </SpatialNavigationView>
            ))}
          </SpatialNavigationView>
        </Animated.View>
      </View>
    </SpatialNavigationRoot>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: px(680),
    borderTopLeftRadius: radius.lg * 1.5,
    borderTopRightRadius: radius.lg * 1.5,
    overflow: 'hidden',
    borderTopWidth: px(2),
    borderColor: 'rgba(245,198,107,0.35)',
  },
  head: { paddingHorizontal: safe.x, paddingTop: px(40), paddingBottom: px(22), gap: px(6) },
  grid: { paddingHorizontal: safe.x, gap: px(18) },
  row: { flexDirection: 'row', gap: px(22) },
  card: {
    width: px(300),
    height: px(112),
    padding: px(20),
    justifyContent: 'space-between',
    backgroundColor: 'rgba(247,241,227,0.06)',
    borderWidth: px(1.5),
    borderColor: colors.line,
    borderRadius: radius.md,
  },
  cardSelected: { borderColor: colors.gold, backgroundColor: 'rgba(245,198,107,0.12)' },
  cardFocused: { backgroundColor: colors.parchment, borderColor: colors.parchment },
  cardFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: px(8) },
});
