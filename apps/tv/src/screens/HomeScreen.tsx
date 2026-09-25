import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  DefaultFocus,
  SpatialNavigationRoot,
  SpatialNavigationScrollView,
  SpatialNavigationView,
} from 'react-tv-space-navigation';
import type { Story } from '@storyloom/protocol';
import { useT, type StringKey } from '../i18n';
import { Button } from '../components/Button';
import { Focusable } from '../components/Focusable';
import { Icon, IconName } from '../components/Icon';
import { Logo } from '../components/Logo';
import { AvatarStack } from '../components/Avatar';
import { StoryArt } from '../components/StoryArt';
import { useSky } from '../components/sky/skyState';
import { T } from '../components/Typography';
import { STARTERS } from '../data/library';
import { useLibrary } from '../state/library';
import { colors, px, radius, safe } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;
type FocusInfo = { kind: 'story'; id: string } | { kind: 'starter'; id: string };

const native = Platform.OS !== 'web';

// Vertical rhythm (1080p design units). The info panel is fixed; everything
// focusable below it scrolls inside a clipped "shelf" area.
const SHELF_TOP = px(610);
const SHELF_OFFSET = px(80);

export function HomeScreen({ navigation }: Props) {
  useSky('left');
  const isFocused = useIsFocused();
  const t = useT();
  const stories = useLibrary((s) => s.stories);
  const [info, setInfo] = useState<FocusInfo>({ kind: 'story', id: stories[0]?.id });
  const [inShelf, setInShelf] = useState(false);

  const story = useMemo(
    () => stories.find((s) => info.kind === 'story' && s.id === info.id) ?? stories[0],
    [stories, info],
  );
  const starter = info.kind === 'starter' ? STARTERS.find((s) => s.id === info.id) : undefined;

  const readStory = useCallback((id: string) => navigation.navigate('Player', { storyId: id }), [navigation]);
  const weave = useCallback((s?: string) => navigation.navigate('Lobby', { starter: s }), [navigation]);

  const actionsOpacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.timing(actionsOpacity, { toValue: inShelf ? 0 : 1, duration: 260, useNativeDriver: native }).start();
  }, [inShelf, actionsOpacity]);

  return (
    <SpatialNavigationRoot isActive={isFocused}>
      <View style={styles.screen}>
        {/* Living sky: sun by day, moon and stars by night */}
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(4,6,24,0)', 'rgba(4,6,24,0.55)', 'rgba(4,6,24,0.85)']}
          locations={[0.5, 0.75, 1]}
          style={StyleSheet.absoluteFill}
        />

        {/* Fixed info panel */}
        <View style={styles.info} pointerEvents="none">
          {starter ? (
            <>
              <T variant="overline" color={colors.gold}>
                {t('home.newStory')}
              </T>
              <T variant="hero" numberOfLines={2} style={styles.title}>
                {t(`starter.${starter.id}.title` as StringKey)}
              </T>
              <T variant="body" color={colors.muted} numberOfLines={2} style={styles.summary}>
                {starter.id === 'draw'
                  ? t('home.drawBody')
                  : t('home.starterBody', { subtitle: t(`starter.${starter.id}.subtitle` as StringKey) })}
              </T>
              <View style={styles.meta}>
                <Chip icon="phone" label={t('home.chipPhone')} />
                <Chip icon="shield" label={t('home.chipSafe')} />
              </View>
            </>
          ) : story ? (
            <>
              <T variant="overline" color={colors.gold}>
                {story.id === stories[0]?.id ? t('home.tonight') : t('home.fromShelf')}
              </T>
              <T variant="hero" numberOfLines={2} style={styles.title}>
                {story.title}
              </T>
              <T variant="body" color={colors.muted} numberOfLines={2} style={styles.summary}>
                {story.summary}
              </T>
              <View style={styles.meta}>
                <Chip icon="sparkle" label={t(`mood.${story.mood}` as StringKey)} />
                <Chip icon="book" label={t('home.pages', { n: new Set(story.pages.map((p) => p.index)).size || '·' })} />
                <View style={styles.woven}>
                  <AvatarStack people={story.contributors} size={px(40)} />
                  <T variant="caption" color={colors.parchment}>
                    {t('home.wovenBy', { names: story.contributors.map((c) => c.name).join(', ') })}
                  </T>
                </View>
              </View>
            </>
          ) : null}
        </View>

        <SpatialNavigationView direction="vertical" style={styles.fill}>
          {/* Top bar */}
          <SpatialNavigationView direction="horizontal" style={styles.topBar}>
            <Logo />
            <Button label={t('home.settings')} icon="settings" kind="quiet" onSelect={() => navigation.navigate('Settings')} onFocus={() => setInShelf(false)} />
          </SpatialNavigationView>

          {/* Shelf */}
          <View style={styles.shelfClip}>
            <SpatialNavigationScrollView offsetFromStart={SHELF_OFFSET} style={styles.fill}>
              <Animated.View style={{ opacity: actionsOpacity }}>
                <SpatialNavigationView direction="horizontal" style={styles.actions}>
                  <DefaultFocus>
                    <Button
                      label={t('home.read')}
                      icon="play"
                      size="lg"
                      onSelect={() => story && readStory(story.id)}
                      onFocus={() => {
                        setInShelf(false);
                        if (info.kind === 'starter') setInfo({ kind: 'story', id: stories[0]?.id });
                      }}
                    />
                  </DefaultFocus>
                  <Button label={t('home.weave')} icon="sparkle" kind="ghost" size="lg" onSelect={() => weave()} onFocus={() => setInShelf(false)} />
                </SpatialNavigationView>
              </Animated.View>

              <Row title={t('home.rowNew')} hint={t('home.rowNewHint')}>
                {STARTERS.map((s) => (
                  <Focusable
                    key={s.id}
                    onSelect={() => weave(s.id)}
                    onFocus={() => {
                      setInShelf(true);
                      setInfo({ kind: 'starter', id: s.id });
                    }}
                    radius={radius.lg}
                  >
                    {(focused) => (
                      <StarterCard
                        title={t(`starter.${s.id}.title` as StringKey)}
                        subtitle={t(`starter.${s.id}.subtitle` as StringKey)}
                        icon={s.icon}
                        palette={s.palette}
                        seed={`starter-${s.id}`}
                        focused={focused}
                      />
                    )}
                  </Focusable>
                ))}
              </Row>

              <Row title={t('home.rowShelf')} hint={t('home.stories', { n: stories.length })}>
                {stories.map((st) => (
                  <Focusable
                    key={st.id}
                    onSelect={() => readStory(st.id)}
                    onFocus={() => {
                      setInShelf(true);
                      setInfo({ kind: 'story', id: st.id });
                    }}
                    radius={radius.md}
                  >
                    {(focused) => <BookCard story={st} focused={focused} cta={t('home.readCta')} />}
                  </Focusable>
                ))}
              </Row>
              <View style={{ height: px(420) }} />
            </SpatialNavigationScrollView>
          </View>
        </SpatialNavigationView>
      </View>
    </SpatialNavigationRoot>
  );
}

function Chip({ icon, label }: { icon: IconName; label: string }) {
  return (
    <View style={styles.chip}>
      <Icon name={icon} size={px(22)} color={colors.gold} />
      <T variant="caption" color={colors.parchment}>
        {label}
      </T>
    </View>
  );
}

function Row({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowHeader}>
        <T variant="h3">{title}</T>
        {hint ? (
          <T variant="caption" color={colors.dim}>
            {hint.toUpperCase()}
          </T>
        ) : null}
      </View>
      {/* flex: 0 — the library's default flex: 1 collapses nested rows to 0 height on Android. */}
      <SpatialNavigationScrollView horizontal offsetFromStart={safe.x} style={styles.rowScroll}>
        <SpatialNavigationView direction="horizontal" style={styles.rowItems}>
          {children}
        </SpatialNavigationView>
      </SpatialNavigationScrollView>
    </View>
  );
}

function StarterCard({ title, subtitle, icon, palette, seed, focused }: { title: string; subtitle: string; icon: IconName; palette: string[]; seed: string; focused: boolean }) {
  return (
    <View style={styles.starter}>
      <StoryArt seed={seed} palette={palette} />
      <LinearGradient colors={['rgba(7,6,26,0.05)', 'rgba(7,6,26,0.9)']} style={StyleSheet.absoluteFill} />
      <View style={styles.starterBody}>
        <View style={[styles.starterIcon, focused && { backgroundColor: colors.gold }]}>
          <Icon name={icon} size={px(28)} color={focused ? colors.night : colors.gold} />
        </View>
        <T variant="h3" style={{ fontSize: px(30) }}>
          {title}
        </T>
        <T variant="caption" color={colors.muted} style={{ letterSpacing: 0 }}>
          {subtitle}
        </T>
      </View>
    </View>
  );
}

function BookCard({ story, focused, cta }: { story: Story; focused: boolean; cta: string }) {
  return (
    <View style={styles.book}>
      <StoryArt seed={story.id} uri={story.coverUrl} palette={story.palette} shape="tall" />
      <LinearGradient colors={['rgba(7,6,26,0)', 'rgba(7,6,26,0.92)']} locations={[0.4, 1]} style={StyleSheet.absoluteFill} />
      <View style={styles.bookSpine} />
      <View style={styles.bookBody}>
        <T variant="bodyStrong" numberOfLines={3} style={{ fontSize: px(24), lineHeight: px(30) }}>
          {story.title}
        </T>
        <View style={styles.threads}>
          {story.contributors.map((c) => (
            <View key={c.id} style={[styles.threadDot, { backgroundColor: c.color }]} />
          ))}
          {focused ? (
            <T variant="caption" color={colors.gold} style={{ marginLeft: px(8) }}>
              {cta}
            </T>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  fill: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: safe.x,
    paddingTop: safe.y,
  },
  info: { position: 'absolute', left: safe.x, top: px(190), width: px(1150) },
  title: { marginTop: px(12) },
  summary: { marginTop: px(16), width: px(960) },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: px(14), marginTop: px(24) },
  woven: { flexDirection: 'row', alignItems: 'center', gap: px(12), marginLeft: px(8) },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: px(10),
    paddingHorizontal: px(18),
    height: px(44),
    borderRadius: radius.pill,
    backgroundColor: 'rgba(247,241,227,0.08)',
    borderWidth: px(1.5),
    borderColor: colors.line,
  },
  shelfClip: { position: 'absolute', top: SHELF_TOP, left: 0, right: 0, bottom: 0, overflow: 'hidden' },
  actions: { flexDirection: 'row', gap: px(28), paddingHorizontal: safe.x, paddingTop: SHELF_OFFSET, paddingBottom: px(10) },
  row: { marginTop: px(40) },
  rowHeader: { flexDirection: 'row', alignItems: 'baseline', gap: px(18), paddingHorizontal: safe.x, marginBottom: px(6) },
  rowScroll: { flex: 0 },
  rowItems: { flexDirection: 'row', gap: px(34), paddingHorizontal: safe.x, paddingVertical: px(22) },
  starter: { width: px(380), height: px(228) },
  starterBody: { position: 'absolute', left: px(26), right: px(26), bottom: px(20), gap: px(2) },
  starterIcon: {
    width: px(54),
    height: px(54),
    borderRadius: px(27),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(7,6,26,0.55)',
    marginBottom: px(8),
  },
  book: { width: px(240), height: px(352) },
  bookSpine: { position: 'absolute', left: 0, top: 0, bottom: 0, width: px(10), backgroundColor: 'rgba(0,0,0,0.28)' },
  bookBody: { position: 'absolute', left: px(24), right: px(18), bottom: px(20), gap: px(10) },
  threads: { flexDirection: 'row', alignItems: 'center', gap: px(6) },
  threadDot: { width: px(14), height: px(14), borderRadius: px(7) },
});
