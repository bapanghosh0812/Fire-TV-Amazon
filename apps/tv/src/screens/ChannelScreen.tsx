import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { DefaultFocus, SpatialNavigationRoot, SpatialNavigationView } from 'react-tv-space-navigation';
import { useIsFocused } from '@react-navigation/native';
import { IconButton } from '../components/IconButton';
import { Icon } from '../components/Icon';
import { SideSheet } from '../components/SideSheet';
import { T } from '../components/Typography';
import { useSky } from '../components/sky/skyState';
import { playMusic, stopMusic, sfx } from '../audio/director';
import { channelById } from '../data/channels';
import { useT } from '../i18n';
import { useBackHandler, useRemoteKeys } from '../remote/hooks';
import { RemoteKey } from '../remote/keys';
import { useSettings } from '../state/settings';
import { colors, fonts, px, radius, safe } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Channel'>;

const native = Platform.OS !== 'web';
const TIMERS = [15, 30, 45, 60, 90];
const BARS = 28;

// Every read of a player that might have been removed goes through here.
function guard<T>(read: () => T, fallback: T): T {
  try {
    return read();
  } catch {
    return fallback;
  }
}

/** Now playing: a music channel or a sleep sound, over the living sky, with a sleep timer. */
export function ChannelScreen({ route, navigation }: Props) {
  const t = useT();
  const channel = channelById(route.params.channelId);
  const sleep = channel?.kind === 'sleep';
  const [dim, setDim] = useState(false);
  useSky(dim ? 'none' : 'left');
  const isFocused = useIsFocused();
  const volume = useSettings((s) => s.musicVolume);

  const [track, setTrack] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [panel, setPanel] = useState(false);
  const [endsAt, setEndsAt] = useState<number | null>(sleep ? Date.now() + 45 * 60_000 : null);
  const [asleep, setAsleep] = useState(false);
  const [now, setNow] = useState(Date.now());
  const player = useRef<AudioPlayer | null>(null);
  const fade = useRef<ReturnType<typeof setInterval> | null>(null);

  // The app's own background music steps aside while a channel plays.
  useEffect(() => {
    stopMusic();
    return () => playMusic('home');
  }, []);

  // One player for the whole visit; tracks are swapped in place.
  useEffect(() => {
    if (!channel) return;
    const p = createAudioPlayer(channel.tracks[0]);
    p.loop = channel.tracks.length === 1;
    p.volume = 0;
    p.play();
    player.current = p;
    rampVolume(volume, 2500);
    const sub = p.addListener('playbackStatusUpdate', (s) => {
      if (s.didJustFinish && channel.tracks.length > 1) setTrack((i) => (i + 1) % channel.tracks.length);
    });
    return () => {
      if (fade.current) clearInterval(fade.current);
      sub.remove();
      player.current = null;
      try {
        p.pause();
        p.remove();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel]);

  function rampVolume(to: number, ms: number, done?: () => void) {
    if (fade.current) clearInterval(fade.current);
    const from = guard(() => player.current?.volume ?? 0, 0);
    const start = Date.now();
    fade.current = setInterval(() => {
      const k = Math.min(1, (Date.now() - start) / ms);
      const p = player.current;
      if (p) guard(() => (p.volume = from + (to - from) * k), 0);
      if (k >= 1) {
        if (fade.current) clearInterval(fade.current);
        done?.();
      }
    }, 50);
  }

  // Swap tracks (after the first, which the player already has).
  const firstTrack = useRef(true);
  useEffect(() => {
    if (firstTrack.current) {
      firstTrack.current = false;
      return;
    }
    const p = player.current;
    if (!p || !channel) return;
    guard(() => {
      p.replace(channel.tracks[track]);
      p.play();
    }, undefined);
    setPlaying(true);
  }, [track, channel]);

  useEffect(() => {
    const p = player.current;
    if (!p) return;
    guard(() => (playing ? p.play() : p.pause()), undefined);
  }, [playing]);

  useEffect(() => {
    if (!asleep) rampVolume(volume, 400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volume]);

  // A slow clock for the progress bar, the sleep timer and the dimmed clock face.
  useEffect(() => {
    const id = setInterval(() => {
      const p = player.current;
      setNow(Date.now());
      if (p) {
        setPosition(guard(() => p.currentTime ?? 0, 0));
        setDuration(guard(() => p.duration ?? 0, 0));
      }
    }, 500);
    return () => clearInterval(id);
  }, []);

  // Sleep timer: a long, gentle fade, then goodnight.
  useEffect(() => {
    if (endsAt === null || asleep) return;
    const left = endsAt - Date.now();
    const id = setTimeout(() => {
      rampVolume(0, 20_000, () => {
        setPlaying(false);
        setAsleep(true);
      });
    }, Math.max(0, left - 20_000));
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endsAt, asleep]);

  const wake = () => {
    setDim(false);
    if (asleep) {
      setAsleep(false);
      setEndsAt(null);
      setPlaying(true);
      rampVolume(volume, 1500);
    }
  };

  useRemoteKeys((key) => {
    if (key === RemoteKey.Back) return;
    if (dim || asleep) wake();
  }, (dim || asleep) && !panel);

  useRemoteKeys((key) => {
    if (key === RemoteKey.PlayPause) setPlaying((p) => !p);
    if (key === RemoteKey.FastForward && channel && channel.tracks.length > 1) setTrack((i) => (i + 1) % channel.tracks.length);
    if (key === RemoteKey.Rewind && channel && channel.tracks.length > 1) setTrack((i) => (i - 1 + channel.tracks.length) % channel.tracks.length);
  }, !dim && !asleep && !panel);

  useBackHandler(() => {
    if (dim || asleep) {
      wake();
      return true;
    }
    sfx('back');
    return false;
  });

  if (!channel) return null;

  const minutesLeft = endsAt ? Math.max(0, Math.ceil((endsAt - now) / 60_000)) : null;
  const clock = new Date(now).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: !useSettings.getState().clock24h });

  return (
    <View style={styles.screen}>
      <LinearGradient
        pointerEvents="none"
        colors={[`${channel.palette[1]}55`, 'rgba(7,6,26,0)', 'rgba(7,6,26,0.85)']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />

      {!dim && !asleep ? (
        <SpatialNavigationRoot isActive={isFocused && !panel}>
          <View style={styles.body}>
            <View style={styles.info}>
              <View style={styles.badge}>
                <Icon name={sleep ? 'moon' : 'headphones'} size={px(26)} color={colors.gold} />
                <T variant="overline" color={colors.gold}>
                  {sleep ? t('channel.sleepOverline') : t('channel.musicOverline')}
                </T>
              </View>
              <T variant="hero" style={{ marginTop: px(16) }}>
                {t(channel.title)}
              </T>
              <T variant="body" color={colors.muted} style={{ marginTop: px(14), width: px(900) }}>
                {t(channel.blurb)}
              </T>
              <Visualizer playing={playing} color={channel.palette[2]} />
              <View style={styles.meta}>
                {channel.tracks.length > 1 ? (
                  <T variant="caption" color={colors.parchment} style={{ letterSpacing: 0 }}>
                    {t('channel.track', { n: track + 1, total: channel.tracks.length })}
                  </T>
                ) : (
                  <T variant="caption" color={colors.parchment} style={{ letterSpacing: 0 }}>
                    {t('channel.loop')}
                  </T>
                )}
                {minutesLeft !== null ? (
                  <View style={styles.chip}>
                    <Icon name="timer" size={px(22)} color={colors.gold} />
                    <T variant="caption" color={colors.parchment} style={{ letterSpacing: 0 }}>
                      {t('channel.stopsIn', { n: minutesLeft })}
                    </T>
                  </View>
                ) : null}
              </View>
              {channel.tracks.length > 1 ? (
                <View style={styles.progress}>
                  <View style={[styles.progressFill, { width: `${duration ? Math.min(100, (position / duration) * 100) : 0}%` }]} />
                </View>
              ) : null}
            </View>

            <SpatialNavigationView direction="horizontal" style={styles.transport}>
              <IconButton icon="back" label={t('common.back')} onSelect={() => navigation.goBack()} />
              <View style={styles.gap} />
              {channel.tracks.length > 1 ? (
                <IconButton icon="prev" label={t('channel.prev')} onSelect={() => setTrack((i) => (i - 1 + channel.tracks.length) % channel.tracks.length)} />
              ) : null}
              <DefaultFocus>
                <IconButton icon={playing ? 'pause' : 'play'} label={playing ? t('player.pause') : t('player.play')} size="lg" onSelect={() => setPlaying((p) => !p)} />
              </DefaultFocus>
              {channel.tracks.length > 1 ? (
                <IconButton icon="next" label={t('channel.next')} onSelect={() => setTrack((i) => (i + 1) % channel.tracks.length)} />
              ) : null}
              <View style={styles.gap} />
              <IconButton icon="timer" label={t('player.sleep')} active={endsAt !== null} onSelect={() => setPanel(true)} />
              <IconButton icon="moon" label={t('channel.dim')} onSelect={() => setDim(true)} />
            </SpatialNavigationView>
          </View>
        </SpatialNavigationRoot>
      ) : null}

      {dim || asleep ? (
        <View style={[StyleSheet.absoluteFill, styles.dim]}>
          <T style={styles.clock}>{clock}</T>
          <T variant="body" color={colors.dim}>
            {asleep ? t('channel.goodnight') : t(channel.title)}
          </T>
          <T variant="caption" color={colors.dim} style={{ marginTop: px(24), letterSpacing: 0 }}>
            {t('channel.wake')}
          </T>
        </View>
      ) : null}

      {panel ? (
        <SideSheet
          title={t('player.sleep')}
          subtitle={t('channel.sleepHint')}
          onClose={() => setPanel(false)}
          columns={[
            {
              title: t('player.sleep'),
              icon: 'moon',
              value: endsAt === null ? 'off' : 'on',
              options: [{ value: 'off', label: t('player.sleepOff') }, ...TIMERS.map((n) => ({ value: n, label: t('player.minutes', { n }) }))],
              onPick: (v: string | number) => {
                setEndsAt(v === 'off' ? null : Date.now() + Number(v) * 60_000);
                setPanel(false);
              },
            },
          ]}
        />
      ) : null}
    </View>
  );
}

/** A gentle, decorative equalizer that breathes while something plays. */
function Visualizer({ playing, color }: { playing: boolean; color: string }) {
  const bars = useMemo(() => Array.from({ length: BARS }, () => new Animated.Value(0.2)), []);
  useEffect(() => {
    if (!playing) {
      bars.forEach((b) => Animated.timing(b, { toValue: 0.12, duration: 600, useNativeDriver: native }).start());
      return;
    }
    const loops = bars.map((b, i) => {
      const d = 520 + ((i * 137) % 480);
      return Animated.loop(
        Animated.sequence([
          Animated.timing(b, { toValue: 0.35 + ((i * 53) % 60) / 100, duration: d, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
          Animated.timing(b, { toValue: 0.12 + ((i * 29) % 20) / 100, duration: d * 1.1, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
        ]),
      );
    });
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [playing, bars]);
  return (
    <View style={styles.viz}>
      {bars.map((b, i) => (
        <Animated.View key={i} style={[styles.bar, { backgroundColor: color, opacity: 0.55 + (i % 3) * 0.15, transform: [{ scaleY: b }] }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  body: { flex: 1, justifyContent: 'space-between', paddingHorizontal: safe.x, paddingTop: px(170), paddingBottom: safe.y + px(40) },
  info: { width: px(1100) },
  badge: { flexDirection: 'row', alignItems: 'center', gap: px(12) },
  meta: { flexDirection: 'row', alignItems: 'center', gap: px(20), marginTop: px(18) },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: px(10),
    paddingHorizontal: px(16),
    height: px(42),
    borderRadius: radius.pill,
    backgroundColor: 'rgba(247,241,227,0.08)',
    borderWidth: px(1.5),
    borderColor: colors.line,
  },
  viz: { flexDirection: 'row', alignItems: 'center', gap: px(8), height: px(140), marginTop: px(34) },
  bar: { width: px(12), height: px(140), borderRadius: px(6) },
  progress: { width: px(820), height: px(6), borderRadius: px(3), backgroundColor: 'rgba(247,241,227,0.14)', marginTop: px(20), overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.gold },
  transport: { flexDirection: 'row', alignItems: 'center', gap: px(26) },
  gap: { width: px(30) },
  dim: { backgroundColor: 'rgba(2,2,10,0.9)', alignItems: 'center', justifyContent: 'center' },
  clock: { fontFamily: fonts.display, fontSize: px(150), lineHeight: px(170), color: 'rgba(247,241,227,0.55)' },
});
