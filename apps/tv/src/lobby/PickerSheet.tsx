import React, { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { DefaultFocus, SpatialNavigationRoot, SpatialNavigationScrollView, SpatialNavigationView } from 'react-tv-space-navigation';
import type { Thread, ThreadKind } from '@storyloom/protocol';
import { Focusable } from '../components/Focusable';
import { StoryArt } from '../components/StoryArt';
import { T } from '../components/Typography';
import { HERO_PRESETS, SPARK_PRESETS, WORLD_PRESETS } from '../data/library';
import { useBackHandler } from '../remote/hooks';
import { useT, type StringKey } from '../i18n';
import { colors, px, radius, safe } from '../theme/tokens';

const native = Platform.OS !== 'web';

const TITLES: Record<ThreadKind, { title: StringKey; hint: StringKey }> = {
  hero: { title: 'picker.hero.title', hint: 'picker.hero.hint' },
  world: { title: 'picker.world.title', hint: 'picker.world.hint' },
  spark: { title: 'picker.spark.title', hint: 'picker.spark.hint' },
};

interface Props {
  kind: ThreadKind;
  onPick: (t: Thread) => void;
  onClose: () => void;
}

export function PickerSheet({ kind, onPick, onClose }: Props) {
  const t = useT();
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(slide, { toValue: 1, useNativeDriver: native, speed: 16, bounciness: 4 }).start();
  }, [slide]);

  useBackHandler(() => {
    onClose();
    return true;
  });

  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [px(420), 0] });

  // Presets are shown (and sent to the story writer) in the family's language.
  const items =
    kind === 'hero'
      ? HERO_PRESETS.map((h) => {
          const name = t(`preset.${h.id}.name` as StringKey);
          const description = t(`preset.${h.id}.desc` as StringKey);
          return { id: h.id, label: name, sub: description, thread: { kind: 'hero', by: 'tv', name, description, presetId: h.id } as Thread };
        })
      : (kind === 'world' ? WORLD_PRESETS : SPARK_PRESETS).map((w) => {
          const text = t(`${kind}.${w.id}` as StringKey);
          return { id: w.id, label: text.charAt(0).toUpperCase() + text.slice(1), sub: '', thread: { kind, by: 'tv', text, presetId: w.id } as Thread };
        });

  return (
    <SpatialNavigationRoot isActive>
      <View style={StyleSheet.absoluteFill}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim, opacity: slide }]} />
        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          <LinearGradient colors={[colors.surface, colors.ink]} style={StyleSheet.absoluteFill} />
          <View style={styles.head}>
            <T variant="h1">{t(TITLES[kind].title)}</T>
            <T variant="body" color={colors.muted}>
              {t(TITLES[kind].hint)}
            </T>
          </View>
          <SpatialNavigationScrollView horizontal offsetFromStart={safe.x} style={{ flex: 0 }}>
            <SpatialNavigationView direction="horizontal" style={styles.row}>
              {items.map((it, i) => {
                const node = (
                  <Focusable key={it.id} onSelect={() => onPick(it.thread)} radius={radius.lg}>
                    {(focused) => (
                      <View style={styles.item}>
                        <StoryArt seed={`${kind}-${it.id}`} shape="tall" />
                        <LinearGradient colors={['rgba(7,6,26,0)', 'rgba(7,6,26,0.92)']} locations={[0.3, 1]} style={StyleSheet.absoluteFill} />
                        <View style={styles.itemBody}>
                          <T variant="h3" color={focused ? colors.goldBright : colors.parchment} numberOfLines={3}>
                            {it.label}
                          </T>
                          {it.sub ? (
                            <T variant="caption" color={colors.muted} numberOfLines={3} style={{ letterSpacing: 0 }}>
                              {it.sub}
                            </T>
                          ) : null}
                        </View>
                      </View>
                    )}
                  </Focusable>
                );
                return i === 0 ? <DefaultFocus key={it.id}>{node}</DefaultFocus> : node;
              })}
            </SpatialNavigationView>
          </SpatialNavigationScrollView>
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
    height: px(640),
    borderTopLeftRadius: radius.lg * 1.5,
    borderTopRightRadius: radius.lg * 1.5,
    overflow: 'hidden',
    borderTopWidth: px(2),
    borderColor: 'rgba(245,198,107,0.35)',
  },
  head: { paddingHorizontal: safe.x, paddingTop: px(44), paddingBottom: px(20), gap: px(6) },
  row: { flexDirection: 'row', gap: px(32), paddingHorizontal: safe.x, paddingVertical: px(24) },
  item: { width: px(290), height: px(380) },
  itemBody: { position: 'absolute', left: px(22), right: px(22), bottom: px(22), gap: px(6) },
});
