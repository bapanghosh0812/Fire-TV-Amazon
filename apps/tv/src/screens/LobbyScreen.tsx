import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import { useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { DefaultFocus, SpatialNavigationRoot, SpatialNavigationView } from 'react-tv-space-navigation';
import type { Mood, Thread, ThreadKind } from '@storyloom/protocol';
import { Button } from '../components/Button';
import { Focusable } from '../components/Focusable';
import { Icon, IconName } from '../components/Icon';
import { Avatar } from '../components/Avatar';
import { Pill } from '../components/Pill';
import { Starfield } from '../components/Starfield';
import { StoryArt } from '../components/StoryArt';
import { T } from '../components/Typography';
import { PickerSheet } from '../lobby/PickerSheet';
import { HeroReveal } from '../lobby/HeroReveal';
import { useRoom } from '../state/room';
import { openRoom, closeRoom, startWeave, syncToRoom } from '../services/session';
import { colors, fonts, px, radius, safe } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Lobby'>;

const MOODS: { id: Mood; label: string; icon: IconName }[] = [
  { id: 'cozy', label: 'Cozy', icon: 'moon' },
  { id: 'adventure', label: 'Adventure', icon: 'globe' },
  { id: 'silly', label: 'Silly', icon: 'sparkle' },
  { id: 'curious', label: 'Curious', icon: 'bolt' },
];

const THREADS: { kind: ThreadKind; title: string; ask: string; icon: IconName }[] = [
  { kind: 'hero', title: 'Our hero', ask: 'Draw a hero and snap it with your phone', icon: 'brush' },
  { kind: 'world', title: 'The world', ask: 'Say where the story happens', icon: 'globe' },
  { kind: 'spark', title: 'The spark', ask: 'Add a twist, a problem or a wish', icon: 'bolt' },
];

export function LobbyScreen({ navigation, route }: Props) {
  const isFocused = useIsFocused();
  const room = useRoom();
  const [picker, setPicker] = useState<ThreadKind | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    const starter = route.params?.starter;
    if (starter && ['cozy', 'adventure', 'silly', 'curious'].includes(starter)) room.setMood(starter as Mood);
    openRoom().catch(() => {});
    return () => closeRoom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ready = !!room.threads.hero && !!room.threads.world;

  const onStart = useCallback(async () => {
    if (!ready || starting) return;
    setStarting(true);
    try {
      const storyId = await startWeave();
      navigation.replace('Weaving', { storyId });
    } finally {
      setStarting(false);
    }
  }, [ready, starting, navigation]);

  const whoIs = useCallback(
    (id?: string) => (id === 'tv' ? { name: 'Family', color: colors.gold } : room.players.find((p) => p.id === id)),
    [room.players],
  );

  const joinUrl = room.joinUrl ?? 'https://storyloom.app';
  const code = room.code ?? '····';

  return (
    <SpatialNavigationRoot isActive={isFocused && !picker}>
      <View style={styles.screen}>
        <LinearGradient colors={['#120E38', colors.night]} style={StyleSheet.absoluteFill} />
        <Starfield density={70} />

        <View style={styles.header}>
          <T variant="overline" color={colors.gold}>
            STORY STUDIO
          </T>
          <T variant="h1">Let’s weave a story together</T>
        </View>

        <View style={styles.body}>
          {/* Join panel */}
          <View style={styles.joinPanel}>
            <View style={styles.qrFrame}>
              <QRCode value={joinUrl} size={px(250)} color={colors.night} backgroundColor={colors.parchment} />
            </View>
            <T variant="caption" color={colors.muted} align="center" style={{ marginTop: px(22) }}>
              SCAN TO JOIN, OR VISIT storyloom.app
            </T>
            <View style={styles.codeRow}>
              {code.split('').map((ch, i) => (
                <View key={i} style={styles.codeCell}>
                  <T style={styles.codeChar}>{ch}</T>
                </View>
              ))}
            </View>
            <View style={styles.players}>
              {room.players.length === 0 ? (
                <View style={styles.waiting}>
                  <Icon name="phone" size={px(28)} color={colors.dim} />
                  <T variant="body" color={colors.dim}>
                    Waiting for the family…
                  </T>
                </View>
              ) : (
                room.players.map((p) => (
                  <View key={p.id} style={styles.player}>
                    <Avatar name={p.name} color={p.color} size={px(64)} />
                    <T variant="caption" color={colors.parchment}>
                      {p.name}
                    </T>
                  </View>
                ))
              )}
            </View>
          </View>

          {/* Threads */}
          <View style={styles.threadsCol}>
            <SpatialNavigationView direction="vertical" style={{ gap: px(26) }}>
              {THREADS.map((t, i) => {
                const value = room.threads[t.kind];
                const by = whoIs(value?.by);
                const card = (
                  <Focusable key={t.kind} onSelect={() => setPicker(t.kind)} radius={radius.lg} scale={1.03}>
                    {(focused) => (
                      <ThreadCard
                        title={t.title}
                        ask={t.ask}
                        icon={t.icon}
                        value={value}
                        byName={by?.name}
                        byColor={by?.color}
                        focused={focused}
                        processing={t.kind === 'hero' ? room.heroProcessing : undefined}
                      />
                    )}
                  </Focusable>
                );
                return i === 0 ? <DefaultFocus key={t.kind}>{card}</DefaultFocus> : card;
              })}

              <SpatialNavigationView direction="horizontal" style={styles.settings}>
                {MOODS.map((m) => (
                  <Pill
                    key={m.id}
                    label={m.label}
                    icon={m.icon}
                    selected={room.mood === m.id}
                    onSelect={() => {
                      room.setMood(m.id);
                      syncToRoom({ action: 'settings', mood: m.id });
                    }}
                  />
                ))}
                <View style={styles.settingsSep} />
                <Pill
                  label="Short"
                  selected={room.length === 'short'}
                  onSelect={() => {
                    room.setLength('short');
                    syncToRoom({ action: 'settings', length: 'short' });
                  }}
                />
                <Pill
                  label="Longer"
                  selected={room.length === 'medium'}
                  onSelect={() => {
                    room.setLength('medium');
                    syncToRoom({ action: 'settings', length: 'medium' });
                  }}
                />
              </SpatialNavigationView>

              <View style={styles.startRow}>
                <T variant="caption" color={ready ? colors.teal : colors.dim}>
                  {ready ? 'READY WHEN YOU ARE' : 'ADD A HERO AND A WORLD TO BEGIN'}
                </T>
                <Button label={starting ? 'Starting…' : 'Start weaving'} icon="sparkle" size="lg" disabled={!ready} onSelect={onStart} />
              </View>
            </SpatialNavigationView>
          </View>
        </View>

        {picker ? (
          <PickerSheet
            kind={picker}
            onClose={() => setPicker(null)}
            onPick={(thread: Thread) => {
              useRoom.getState().setThread(thread);
              syncToRoom({ action: 'thread.set', thread });
              setPicker(null);
            }}
          />
        ) : null}
      </View>
    </SpatialNavigationRoot>
  );
}

function ThreadCard({
  title,
  ask,
  icon,
  value,
  byName,
  byColor,
  focused,
  processing,
}: {
  title: string;
  ask: string;
  icon: IconName;
  value?: Thread;
  byName?: string;
  byColor?: string;
  focused: boolean;
  processing?: { by: string; drawingUrl: string };
}) {
  const filled = !!value;
  const hero = value?.kind === 'hero' ? value : undefined;
  const text = value ? (value.kind === 'hero' ? value.name : value.text) : undefined;
  const threadColor = byColor ?? (focused ? colors.gold : 'rgba(247,241,227,0.18)');

  const showReveal = !!processing || !!hero?.drawingUrl;

  return (
    <View style={[styles.card, focused && { backgroundColor: colors.surfaceHigh }]}>
      <View style={[styles.cardThread, { backgroundColor: threadColor }]} />
      <View style={styles.cardIcon}>
        {hero && !showReveal ? (
          <StoryArt seed={`hero-${hero.name}`} uri={hero.portraitUrl} shape="tall" />
        ) : showReveal ? (
          <HeroReveal drawingUrl={hero?.drawingUrl ?? processing!.drawingUrl} portraitUrl={hero?.portraitUrl} />
        ) : (
          <Icon name={icon} size={px(44)} color={filled ? colors.gold : colors.muted} />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <T variant="overline" color={filled ? colors.gold : colors.dim}>
          {title.toUpperCase()}
        </T>
        <T variant={filled ? 'h2' : 'body'} color={filled ? colors.parchment : colors.muted} numberOfLines={2} style={{ marginTop: px(6) }}>
          {processing && !hero ? 'Bringing the drawing to life…' : (text ?? ask)}
        </T>
        {hero?.description ? (
          <T variant="caption" color={colors.muted} numberOfLines={1} style={{ marginTop: px(4) }}>
            {hero.description}
          </T>
        ) : null}
      </View>
      <View style={styles.cardRight}>
        {byName ? (
          <View style={styles.byline}>
            <View style={[styles.byDot, { backgroundColor: byColor }]} />
            <T variant="caption" color={colors.muted}>
              {byName}
            </T>
          </View>
        ) : null}
        <T variant="caption" color={focused ? colors.gold : colors.dim}>
          {focused ? (filled ? 'CHANGE ›' : 'CHOOSE ON TV ›') : ' '}
        </T>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.night },
  header: { paddingHorizontal: safe.x, paddingTop: safe.y + px(10), gap: px(8) },
  body: { flex: 1, flexDirection: 'row', paddingHorizontal: safe.x, paddingTop: px(40), gap: px(64) },
  joinPanel: {
    width: px(520),
    alignItems: 'center',
    paddingVertical: px(40),
    paddingHorizontal: px(30),
    borderRadius: radius.lg,
    backgroundColor: 'rgba(23,20,58,0.75)',
    borderWidth: px(1.5),
    borderColor: colors.line,
    alignSelf: 'flex-start',
  },
  qrFrame: { padding: px(22), backgroundColor: colors.parchment, borderRadius: radius.md },
  codeRow: { flexDirection: 'row', gap: px(12), marginTop: px(16) },
  codeCell: {
    width: px(72),
    height: px(88),
    borderRadius: radius.sm,
    backgroundColor: colors.ink,
    borderWidth: px(2),
    borderColor: 'rgba(245,198,107,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeChar: { fontFamily: fonts.displayBold, fontSize: px(52), lineHeight: px(64), color: colors.gold },
  players: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: px(22), marginTop: px(34), minHeight: px(100) },
  waiting: { flexDirection: 'row', alignItems: 'center', gap: px(12) },
  player: { alignItems: 'center', gap: px(8) },
  threadsCol: { flex: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: px(30),
    height: px(170),
    paddingRight: px(34),
    backgroundColor: 'rgba(23,20,58,0.8)',
    borderRadius: radius.lg,
  },
  cardThread: { width: px(10), alignSelf: 'stretch' },
  cardIcon: {
    width: px(120),
    height: px(120),
    borderRadius: radius.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(7,6,26,0.6)',
  },
  cardRight: { alignItems: 'flex-end', gap: px(14), minWidth: px(220) },
  byline: { flexDirection: 'row', alignItems: 'center', gap: px(10) },
  byDot: { width: px(16), height: px(16), borderRadius: px(8) },
  settings: { flexDirection: 'row', alignItems: 'center', gap: px(16), marginTop: px(6) },
  settingsSep: { width: px(2), height: px(40), backgroundColor: colors.line, marginHorizontal: px(8) },
  startRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: px(30), marginTop: px(8) },
});
