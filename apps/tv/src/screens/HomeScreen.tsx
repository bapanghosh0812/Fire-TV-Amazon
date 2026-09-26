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
import { Pill } from '../components/Pill';
import { AvatarStack } from '../components/Avatar';
import { StoryArt } from '../components/StoryArt';
import { useSky } from '../components/sky/skyState';
import { T } from '../components/Typography';
import { STARTERS } from '../data/library';
import { SERIES, catalogStory, newEpisodes, seriesOf } from '../data/series';
import { MUSIC, SLEEP, channelById, type Channel } from '../data/channels';
import { storySummary, storyTitle } from '../player/tracks';
import { useLibrary } from '../state/library';
import { useSettings } from '../state/settings';
import { colors, px, radius, safe } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;
type Tab = 'home' | 'series' | 'stories' | 'music' | 'sleep';
type FocusInfo = { kind: 'story'; id: string } | { kind: 'starter'; id: string } | { kind: 'channel'; id: string };

const native = Platform.OS !== 'web';
const TABS: { id: Tab; icon: IconName; label: StringKey }[] = [
  { id: 'home', icon: 'home', label: 'tab.home' },
  { id: 'series', icon: 'tv', label: 'tab.series' },
  { id: 'stories', icon: 'book', label: 'tab.stories' },
  { id: 'music', icon: 'headphones', label: 'tab.music' },
  { id: 'sleep', icon: 'moon', label: 'tab.sleep' },
];

// Vertical rhythm (1080p design units). The info panel is fixed; everything
// focusable below it scrolls inside a clipped "shelf" area.
const SHELF_TOP = px(610);
const SHELF_OFFSET = px(80);

export function HomeScreen({ navigation }: Props) {
  useSky('left');
  const isFocused = useIsFocused();
  const t = useT();
  const lang = useSettings((s) => s.language);
  const track = (lang ?? 'en').split('-')[0];
  const stories = useLibrary((s) => s.stories);
  const [tab, setTab] = useState<Tab>('home');
  const [info, setInfo] = useState<FocusInfo>({ kind: 'story', id: stories[0]?.id });
  const [inShelf, setInShelf] = useState(false);

  const find = useCallback((id: string) => stories.find((s) => s.id === id) ?? catalogStory(id), [stories]);
  const story = info.kind === 'story' ? find(info.id) ?? stories[0] : undefined;
  const starter = info.kind === 'starter' ? STARTERS.find((s) => s.id === info.id) : undefined;
  const channel = info.kind === 'channel' ? channelById(info.id) : undefined;

  const readStory = useCallback((id: string) => navigation.navigate('Player', { storyId: id }), [navigation]);
  const weave = useCallback((s?: string) => navigation.navigate('Lobby', { starter: s }), [navigation]);
  const listen = useCallback((id: string) => navigation.navigate('Channel', { channelId: id }), [navigation]);

  const pickTab = (next: Tab) => {
    setInShelf(false);
    if (next === tab) return;
    setTab(next);
    if (next === 'series') setInfo({ kind: 'story', id: newEpisodes()[0].id });
    else if (next === 'music') setInfo({ kind: 'channel', id: MUSIC[0].id });
    else if (next === 'sleep') setInfo({ kind: 'channel', id: SLEEP[0].id });
    else setInfo({ kind: 'story', id: stories[0]?.id });
  };

  const actionsOpacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.timing(actionsOpacity, { toValue: inShelf ? 0 : 1, duration: 260, useNativeDriver: native }).start();
  }, [inShelf, actionsOpacity]);

  const learn = useMemo(
    () => [...stories.filter((s) => s.mood === 'curious'), ...SERIES.filter((s) => s.learn).flatMap((s) => s.episodes.map(find))].filter(
      (s, i, all): s is Story => !!s && all.findIndex((x) => x?.id === s.id) === i,
    ),
    [stories, find],
  );

  const focusStory = (id: string) => () => {
    setInShelf(true);
    setInfo({ kind: 'story', id });
  };
  const focusChannel = (id: string) => () => {
    setInShelf(true);
    setInfo({ kind: 'channel', id });
  };

  const bookRow = (key: string, title: string, list: Story[], hint?: string) => (
    <Row key={key} title={title} hint={hint}>
      {list.map((st) => (
        <Focusable key={st.id} onSelect={() => readStory(st.id)} onFocus={focusStory(st.id)} radius={radius.md}>
          {(focused) => <BookCard story={st} title={storyTitle(st, track)} focused={focused} cta={t('home.readCta')} />}
        </Focusable>
      ))}
    </Row>
  );

  const episodeRow = (key: string, title: string, list: Story[], hint?: string) => (
    <Row key={key} title={title} hint={hint}>
      {list.map((st) => {
        const s = seriesOf(st.id);
        return (
          <Focusable key={st.id} onSelect={() => readStory(st.id)} onFocus={focusStory(st.id)} radius={radius.lg}>
            {(focused) => (
              <EpisodeCard
                story={st}
                title={storyTitle(st, track)}
                label={s ? t('series.episode', { n: s.episode }) : ''}
                series={s ? t(s.series.title) : ''}
                focused={focused}
              />
            )}
          </Focusable>
        );
      })}
    </Row>
  );

  const channelRow = (key: string, title: string, list: Channel[], hint?: string) => (
    <Row key={key} title={title} hint={hint}>
      {list.map((c) => (
        <Focusable key={c.id} onSelect={() => listen(c.id)} onFocus={focusChannel(c.id)} radius={radius.lg}>
          {(focused) => (
            <ChannelCard
              channel={c}
              title={t(c.title)}
              sub={c.kind === 'sleep' ? t('channel.loopShort') : t('channel.tracks', { n: c.tracks.length })}
              focused={focused}
            />
          )}
        </Focusable>
      ))}
    </Row>
  );

  const starterRow = (
    <Row key="new" title={t('home.rowNew')} hint={t('home.rowNewHint')}>
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
  );

  const bedtimeMusic = MUSIC.filter((c) => c.id === 'lullaby' || c.id === 'piano' || c.id === 'dreamy');
  const rows: React.ReactNode[] =
    tab === 'home'
      ? [
          episodeRow('episodes', t('home.rowEpisodes'), newEpisodes(), t('home.rowEpisodesHint')),
          starterRow,
          bookRow('shelf', t('home.rowShelf'), stories, t('home.stories', { n: stories.length })),
          channelRow('music', t('home.rowMusic'), MUSIC, t('home.rowMusicHint')),
          channelRow('sleep', t('home.rowSleep'), SLEEP, t('home.rowSleepHint')),
        ]
      : tab === 'series'
        ? SERIES.map((s) =>
            episodeRow(
              s.id,
              t(s.title),
              s.episodes.map(find).filter((x): x is Story => !!x),
              t('series.count', { n: s.episodes.length }),
            ),
          )
        : tab === 'stories'
          ? [bookRow('shelf', t('home.rowShelf'), stories, t('home.stories', { n: stories.length })), starterRow, bookRow('learn', t('home.rowLearn'), learn)]
          : tab === 'music'
            ? [channelRow('music', t('home.rowMusic'), MUSIC, t('home.rowMusicHint')), channelRow('bed', t('home.rowBedtimeMusic'), bedtimeMusic)]
            : [channelRow('sleep', t('home.rowSleep'), SLEEP, t('home.rowSleepHint')), channelRow('calm', t('home.rowCalmMusic'), bedtimeMusic)];

  const s = story ? seriesOf(story.id) : undefined;

  return (
    <SpatialNavigationRoot isActive={isFocused}>
      <View style={styles.screen}>
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(4,6,24,0)', 'rgba(4,6,24,0.55)', 'rgba(4,6,24,0.85)']}
          locations={[0.5, 0.75, 1]}
          style={StyleSheet.absoluteFill}
        />

        {/* Fixed info panel for whatever has focus */}
        <View style={styles.info} pointerEvents="none">
          {channel ? (
            <>
              <T variant="overline" color={colors.gold}>
                {channel.kind === 'sleep' ? t('channel.sleepOverline') : t('channel.musicOverline')}
              </T>
              <T variant="hero" numberOfLines={2} style={styles.title}>
                {t(channel.title)}
              </T>
              <T variant="body" color={colors.muted} numberOfLines={2} style={styles.summary}>
                {t(channel.blurb)}
              </T>
              <View style={styles.meta}>
                <Chip icon={channel.icon} label={channel.kind === 'sleep' ? t('channel.loopShort') : t('channel.tracks', { n: channel.tracks.length })} />
                <Chip icon="timer" label={t('channel.timerChip')} />
                <Chip icon="sparkle" label={t('channel.original')} />
              </View>
            </>
          ) : starter ? (
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
                {s
                  ? `${t(s.series.title)} · ${t('series.episode', { n: s.episode })}`.toUpperCase()
                  : story.id === stories[0]?.id
                    ? t('home.tonight')
                    : t('home.fromShelf')}
              </T>
              <T variant="hero" numberOfLines={2} style={styles.title}>
                {storyTitle(story, track)}
              </T>
              <T variant="body" color={colors.muted} numberOfLines={2} style={styles.summary}>
                {storySummary(story, track)}
              </T>
              <View style={styles.meta}>
                <Chip icon="sparkle" label={t(`mood.${story.mood}` as StringKey)} />
                <Chip icon="book" label={t('home.pages', { n: new Set(story.pages.map((p) => p.index)).size || '·' })} />
                {story.contributors.length ? (
                  <View style={styles.woven}>
                    <AvatarStack people={story.contributors} size={px(40)} />
                    <T variant="caption" color={colors.parchment}>
                      {t('home.wovenBy', { names: story.contributors.map((c) => c.name).join(', ') })}
                    </T>
                  </View>
                ) : (
                  <Chip icon="star" label={t('end.original')} />
                )}
              </View>
            </>
          ) : null}
        </View>

        <SpatialNavigationView direction="vertical" style={styles.fill}>
          {/* Top bar: logo, category tabs, settings */}
          <SpatialNavigationView direction="horizontal" style={styles.topBar}>
            <Logo />
            <SpatialNavigationView direction="horizontal" style={styles.tabs}>
              {TABS.map((x) => (
                <Pill key={x.id} label={t(x.label)} icon={x.icon} selected={tab === x.id} onFocus={() => pickTab(x.id)} onSelect={() => pickTab(x.id)} />
              ))}
            </SpatialNavigationView>
            <Button label={t('home.settings')} icon="settings" kind="quiet" onSelect={() => navigation.navigate('Settings')} onFocus={() => setInShelf(false)} />
          </SpatialNavigationView>

          {/* Shelf */}
          <View style={styles.shelfClip}>
            <SpatialNavigationScrollView offsetFromStart={SHELF_OFFSET} style={styles.fill}>
              <Animated.View style={{ opacity: actionsOpacity }}>
                <SpatialNavigationView direction="horizontal" style={styles.actions}>
                  <DefaultFocus>
                    <Button
                      label={channel ? t('channel.listen') : s ? t('series.play') : t('home.read')}
                      icon="play"
                      size="lg"
                      onSelect={() => (channel ? listen(channel.id) : story ? readStory(story.id) : weave(starter?.id))}
                      onFocus={() => setInShelf(false)}
                    />
                  </DefaultFocus>
                  <Button label={t('home.weave')} icon="sparkle" kind="ghost" size="lg" onSelect={() => weave()} onFocus={() => setInShelf(false)} />
                </SpatialNavigationView>
              </Animated.View>
              {rows}
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

function EpisodeCard({ story, title, label, series, focused }: { story: Story; title: string; label: string; series: string; focused: boolean }) {
  return (
    <View style={styles.starter}>
      <StoryArt seed={story.id} uri={story.coverUrl} palette={story.palette} />
      <LinearGradient colors={['rgba(7,6,26,0)', 'rgba(7,6,26,0.92)']} locations={[0.3, 1]} style={StyleSheet.absoluteFill} />
      {label ? (
        <View style={[styles.epBadge, focused && { backgroundColor: colors.gold }]}>
          <T variant="caption" color={focused ? colors.night : colors.parchment} style={{ letterSpacing: 0.5 }}>
            {label.toUpperCase()}
          </T>
        </View>
      ) : null}
      <View style={styles.starterBody}>
        {series ? (
          <T variant="caption" color={colors.gold} numberOfLines={1} style={{ letterSpacing: 0 }}>
            {series}
          </T>
        ) : null}
        <T variant="bodyStrong" numberOfLines={2} style={{ fontSize: px(27), lineHeight: px(33) }}>
          {title}
        </T>
        {focused ? (
          <View style={styles.playHint}>
            <Icon name="play" size={px(18)} color={colors.gold} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

function ChannelCard({ channel, title, sub, focused }: { channel: Channel; title: string; sub: string; focused: boolean }) {
  return (
    <View style={styles.channel}>
      <LinearGradient colors={[channel.palette[1], channel.palette[3], channel.palette[4]]} locations={[0, 0.55, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={[styles.channelGlow, { backgroundColor: channel.palette[2] }]} />
      <View style={styles.channelIcon}>
        <Icon name={channel.icon} size={px(56)} color={channel.palette[2]} strokeWidth={1.8} />
      </View>
      <View style={styles.channelBody}>
        <T variant="bodyStrong" numberOfLines={1} style={{ fontSize: px(27) }}>
          {title}
        </T>
        <T variant="caption" color={colors.muted} style={{ letterSpacing: 0 }}>
          {sub}
        </T>
      </View>
      {focused ? <View style={[styles.channelFocus, { backgroundColor: channel.palette[2] }]} /> : null}
    </View>
  );
}

function BookCard({ story, title, focused, cta }: { story: Story; title: string; focused: boolean; cta: string }) {
  return (
    <View style={styles.book}>
      <StoryArt seed={story.id} uri={story.coverUrl} palette={story.palette} shape="tall" />
      <LinearGradient colors={['rgba(7,6,26,0)', 'rgba(7,6,26,0.92)']} locations={[0.4, 1]} style={StyleSheet.absoluteFill} />
      <View style={styles.bookSpine} />
      <View style={styles.bookBody}>
        <T variant="bodyStrong" numberOfLines={3} style={{ fontSize: px(24), lineHeight: px(30) }}>
          {title}
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
    gap: px(40),
    paddingHorizontal: safe.x,
    paddingTop: safe.y,
  },
  tabs: { flex: 1, flexDirection: 'row', gap: px(14) },
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
  epBadge: {
    position: 'absolute',
    top: px(16),
    left: px(16),
    paddingHorizontal: px(12),
    height: px(34),
    justifyContent: 'center',
    borderRadius: px(10),
    backgroundColor: 'rgba(7,6,26,0.7)',
  },
  playHint: { position: 'absolute', right: 0, bottom: px(4) },
  channel: { width: px(300), height: px(228), overflow: 'hidden' },
  channelGlow: { position: 'absolute', width: px(260), height: px(260), borderRadius: px(130), right: px(-90), top: px(-110), opacity: 0.22 },
  channelIcon: { position: 'absolute', top: px(26), left: px(26) },
  channelBody: { position: 'absolute', left: px(26), right: px(22), bottom: px(20), gap: px(2) },
  channelFocus: { position: 'absolute', left: 0, right: 0, top: 0, height: px(6) },
  book: { width: px(240), height: px(352) },
  bookSpine: { position: 'absolute', left: 0, top: 0, bottom: 0, width: px(10), backgroundColor: 'rgba(0,0,0,0.28)' },
  bookBody: { position: 'absolute', left: px(24), right: px(18), bottom: px(20), gap: px(10) },
  threads: { flexDirection: 'row', alignItems: 'center', gap: px(6) },
  threadDot: { width: px(14), height: px(14), borderRadius: px(7) },
});
