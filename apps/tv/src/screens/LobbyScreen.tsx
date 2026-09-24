import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import { useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { DefaultFocus, SpatialNavigationRoot, SpatialNavigationView } from 'react-tv-space-navigation';
import { languageInfo, type Mood, type Thread, type ThreadKind } from '@storyloom/protocol';
import { LanguageSheet } from '../components/LanguageSheet';
import { useSettings } from '../state/settings';
import { useT, type StringKey } from '../i18n';
import { Button } from '../components/Button';
import { Focusable } from '../components/Focusable';
import { Icon, IconName } from '../components/Icon';
import { Avatar } from '../components/Avatar';
import { Pill } from '../components/Pill';
import { SkyBackdrop } from '../components/sky/SkyBackdrop';
import { StoryArt } from '../components/StoryArt';
import { T } from '../components/Typography';
import { PickerSheet } from '../lobby/PickerSheet';
import { HeroReveal } from '../lobby/HeroReveal';
import { useRoom } from '../state/room';
import { openRoom, closeRoom, startWeave, syncToRoom } from '../services/session';
import { config } from '../services/config';
import { colors, fonts, px, radius, safe } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Lobby'>;

const MOODS: { id: Mood; icon: IconName }[] = [
  { id: 'cozy', icon: 'moon' },
  { id: 'adventure', icon: 'globe' },
  { id: 'silly', icon: 'sparkle' },
  { id: 'curious', icon: 'bolt' },
];

const THREADS: { kind: ThreadKind; title: StringKey; ask: StringKey; icon: IconName }[] = [
  { kind: 'hero', title: 'lobby.hero', ask: 'lobby.heroAsk', icon: 'brush' },
  { kind: 'world', title: 'lobby.world', ask: 'lobby.worldAsk', icon: 'globe' },
  { kind: 'spark', title: 'lobby.spark', ask: 'lobby.sparkAsk', icon: 'bolt' },
];

export function LobbyScreen({ navigation, route }: Props) {
  const isFocused = useIsFocused();
  const t = useT();
  const room = useRoom();
  const [picker, setPicker] = useState<ThreadKind | 'language' | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    const starter = route.params?.starter;
    if (starter && ['cozy', 'adventure', 'silly', 'curious'].includes(starter)) room.setMood(starter as Mood);
    room.setLanguage(useSettings.getState().language);
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
    (id?: string) => (id === 'tv' ? { name: t('lobby.family'), color: colors.gold } : room.players.find((p) => p.id === id)),
    [room.players, t],
  );

  const joinUrl = room.joinUrl ?? config.companionBaseUrl;
  const joinHost = joinUrl.replace(/^https?:\/\//, '').split('/')[0];
  const code = room.code ?? '····';

  return (
    <SpatialNavigationRoot isActive={isFocused && !picker}>
      <View style={styles.screen}>
        <SkyBackdrop scrim="top" />

        <View style={styles.header}>
          <T variant="overline" color={colors.gold}>
            {t('lobby.overline')}
          </T>
          <T variant="h1">{t('lobby.title')}</T>
        </View>

        <View style={styles.body}>
          {/* Join panel */}
          <View style={styles.joinPanel}>
            <View style={styles.qrFrame}>
              <QRCode value={joinUrl} size={px(250)} color={colors.night} backgroundColor={colors.parchment} />
            </View>
            <T variant="caption" color={colors.muted} align="center" style={{ marginTop: px(22) }}>
              {t('lobby.scan', { host: joinHost.toUpperCase() })}
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
                    {t('lobby.waiting')}
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
              {THREADS.map((th, i) => {
                const value = room.threads[th.kind];
                const by = whoIs(value?.by);
                const card = (
                  <Focusable key={th.kind} onSelect={() => setPicker(th.kind)} radius={radius.lg} scale={1.03}>
                    {(focused) => (
                      <ThreadCard
                        title={t(th.title)}
                        ask={t(th.ask)}
                        icon={th.icon}
                        value={value}
                        byName={by?.name}
                        byColor={by?.color}
                        focused={focused}
                        processing={th.kind === 'hero' ? room.heroProcessing : undefined}
                        labels={{ magic: t('lobby.heroMagic'), change: t('lobby.change'), choose: t('lobby.chooseOnTv') }}
                      />
                    )}
                  </Focusable>
                );
                return i === 0 ? <DefaultFocus key={th.kind}>{card}</DefaultFocus> : card;
              })}

              <SpatialNavigationView direction="horizontal" style={styles.settings}>
                {MOODS.map((m) => (
                  <Pill
                    key={m.id}
                    label={t(`moodShort.${m.id}` as StringKey)}
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
                  label={t('lobby.short')}
                  selected={room.length === 'short'}
                  onSelect={() => {
                    room.setLength('short');
                    syncToRoom({ action: 'settings', length: 'short' });
                  }}
                />
                <Pill
                  label={t('lobby.longer')}
                  selected={room.length === 'medium'}
                  onSelect={() => {
                    room.setLength('medium');
                    syncToRoom({ action: 'settings', length: 'medium' });
                  }}
                />
              </SpatialNavigationView>

              <SpatialNavigationView direction="horizontal" style={styles.startRow}>
                <Pill label={`${t('lobby.language')}: ${languageInfo(room.language).native}`} icon="globe" onSelect={() => setPicker('language')} />
                <View style={{ flex: 1 }} />
                <T variant="caption" color={ready ? colors.teal : colors.dim}>
                  {ready ? t('lobby.ready') : t('lobby.needs')}
                </T>
                <Button label={starting ? t('lobby.starting') : t('lobby.start')} icon="sparkle" size="lg" disabled={!ready} onSelect={onStart} />
              </SpatialNavigationView>
            </SpatialNavigationView>
          </View>
        </View>

        {picker === 'language' ? (
          <LanguageSheet
            selected={room.language}
            onClose={() => setPicker(null)}
            onPick={(code) => {
              room.setLanguage(code);
              syncToRoom({ action: 'settings', language: code });
              setPicker(null);
            }}
          />
        ) : picker ? (
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
  labels,
}: {
  title: string;
  ask: string;
  icon: IconName;
  value?: Thread;
  byName?: string;
  byColor?: string;
  focused: boolean;
  processing?: { by: string; drawingUrl: string };
  labels: { magic: string; change: string; choose: string };
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
          {processing && !hero ? labels.magic : (text ?? ask)}
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
          {focused ? (filled ? labels.change : labels.choose) : ' '}
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
