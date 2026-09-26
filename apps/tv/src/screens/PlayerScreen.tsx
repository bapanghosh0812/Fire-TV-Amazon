import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { DefaultFocus, SpatialNavigationRoot, SpatialNavigationView } from 'react-tv-space-navigation';
import type { Story, StoryPage } from '@storyloom/protocol';
import { CrossfadeArt } from '../components/StoryArt';
import { Icon } from '../components/Icon';
import { IconButton } from '../components/IconButton';
import { SideSheet } from '../components/SideSheet';
import { T } from '../components/Typography';
import { useSky } from '../components/sky/skyState';
import { KenBurns } from '../player/KenBurns';
import { Motes } from '../player/Motes';
import { ReadAlongText } from '../player/ReadAlongText';
import { activeMarkAt, buildTimeline } from '../player/readAlong';
import { useNarration } from '../player/useNarration';
import { alexaAvailable, useAlexaVoice } from '../player/useAlexaVoice';
import {
  TRACK_CODE,
  audioTracks,
  captionTracks,
  choiceText,
  originalTrack,
  pageAudio,
  pageText,
  resolveTrack,
  storyTitle,
  trackLabel,
} from '../player/tracks';
import { useT } from '../i18n';
import { ChoiceOverlay } from '../player/ChoiceOverlay';
import { EndOverlay } from '../player/EndOverlay';
import { playMusic, sfx, type Mood } from '../audio/director';
import { useBackHandler, useRemoteKeys } from '../remote/hooks';
import { RemoteKey } from '../remote/keys';
import { useLibrary } from '../state/library';
import { catalogStory, nextEpisode } from '../data/series';
import { useRoom } from '../state/room';
import { useSettings } from '../state/settings';
import { isOfflineDemo } from '../services/config';
import { syncToRoom } from '../services/session';
import { languageInfo } from '@storyloom/protocol';
import { colors, fonts, px, radius, safe } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Player'>;
type Phase = 'reading' | 'choice' | 'end';
type Panel = 'audio' | 'playback' | 'sleep' | null;

const native = Platform.OS !== 'web';
const SPEEDS = [0.75, 0.9, 1, 1.1, 1.25];
const CAPTION_SIZE = { s: 0.78, m: 1, l: 1.18, xl: 1.36 } as const;
const CAPTION_COLOR = { parchment: colors.parchment, white: '#FFFFFF', yellow: '#FFE27A', cyan: '#9EF3FF' } as const;
const CAPTION_FONT = { story: fonts.body, rounded: fonts.bodyBold, readable: fonts.bodyBlack } as const;

function pathFor(story: Story, chosen?: 'a' | 'b'): StoryPage[] {
  const cut = story.choice?.afterPage;
  return story.pages
    .filter((p) => (chosen ? !p.branch || p.branch === chosen : cut === undefined || (!p.branch && p.index <= cut)))
    .sort((a, b) => a.index - b.index);
}

function moodMusic(story?: Story): Mood {
  const m = story?.mood;
  return m === 'silly' || m === 'adventure' || m === 'curious' ? m : 'cozy';
}

export function PlayerScreen({ route, navigation }: Props) {
  const t = useT();
  useSky('none', true);
  const shelved = useLibrary((s) => s.stories.find((x) => x.id === route.params.storyId));
  const story = shelved ?? catalogStory(route.params.storyId); // bookshelf first, then series episodes
  const settings = useSettings();
  const [chosen, setChosen] = useState<'a' | 'b' | undefined>(story?.chosen);
  const [cursor, setCursor] = useState(0);
  const [phase, setPhase] = useState<Phase>('reading');
  const [chrome, setChrome] = useState(true);
  const [panel, setPanel] = useState<Panel>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Audio + subtitle tracks, Netflix-style. Bookshelf stories come in eight languages.
  const tracks = useMemo(() => (story ? audioTracks(story) : ['en']), [story]);
  const subs = useMemo(() => (story ? captionTracks(story) : ['en']), [story]);
  const original = story ? originalTrack(story) : 'en';
  const [audioTrack, setAudioTrack] = useState(() => resolveTrack(settings.audioLanguage === 'original' ? undefined : settings.audioLanguage, tracks, original));
  const [captionTrack, setCaptionTrack] = useState<string>(() =>
    !settings.captions || settings.captionLanguage === 'off' ? 'off' : settings.captionLanguage === 'same' ? 'same' : resolveTrack(settings.captionLanguage, subs, original),
  );
  const shownTrack = captionTrack === 'same' ? (subs.includes(audioTrack) ? audioTrack : original) : captionTrack;
  const [speed, setSpeed] = useState(settings.narrationSpeed);
  const [readToMe, setReadToMe] = useState(settings.autoAdvance);
  const [sleepAt, setSleepAt] = useState<number | 'end' | null>(settings.sleepTimerMin ? Date.now() + settings.sleepTimerMin * 60_000 : null);
  const [asleep, setAsleep] = useState(false);

  const pages = useMemo(() => (story ? pathFor(story, chosen) : []), [story, chosen]);
  const page = pages[cursor];
  const hasChoiceAhead = !!story?.choice && !chosen;
  const knownTotal = story ? new Set(story.pages.map((p) => p.index)).size : 0;

  const audio = useMemo(() => (story && page ? pageAudio(story, page, audioTrack) : {}), [story, page, audioTrack]);
  const spokenText = story && page ? pageText(story, page, audioTrack) : '';
  const captionText = story && page && shownTrack !== 'off' ? pageText(story, page, shownTrack) : '';
  const timeline = useMemo(() => buildTimeline(spokenText, audio.marks), [spokenText, audio.marks]);
  const pageKey = `${story?.id}-${page?.index}-${page?.branch ?? ''}-${audioTrack}`;
  const bedtime = settings.bedtimeMode;

  const goNext = useCallback(() => {
    if (!story) return;
    if (cursor < pages.length - 1) {
      sfx('page');
      setCursor((c) => c + 1);
      return;
    }
    if (hasChoiceAhead) {
      sfx('magic');
      setPhase('choice');
    } else {
      if (sleepAt === 'end') setAsleep(true);
      setPhase('end');
    }
  }, [cursor, pages.length, hasChoiceAhead, story, sleepAt]);

  const goPrev = useCallback(() => {
    if (cursor > 0) sfx('page');
    setCursor((c) => Math.max(0, c - 1));
  }, [cursor]);

  const narration = useNarration({
    pageKey,
    source: settings.narrationVolume > 0 ? audio.source : undefined,
    durationMs: audio.durationMs ?? page?.durationMs ?? timeline.durationMs,
    autoplay: phase === 'reading' && !asleep && !panel,
    rate: speed * (bedtime ? 0.94 : 1),
    volume: settings.narrationVolume * (settings.soundProfile === 'night' ? 0.8 : 1),
    onFinished: () => {
      if (readToMe && !panel) setTimeout(goNext, (settings.pagePause + (bedtime ? 1 : 0)) * 1000);
    },
  });

  // Menus pause the story (like a streaming player) and resume it when they close.
  const resumeAfterPanel = useRef(false);
  useEffect(() => {
    if (panel) {
      resumeAfterPanel.current = narration.playing;
      narration.setPlaying(false);
    } else if (resumeAfterPanel.current) {
      resumeAfterPanel.current = false;
      narration.setPlaying(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panel]);

  // Music follows the story's mood and ducks under the narrator.
  useEffect(() => {
    playMusic(moodMusic(story));
    return () => playMusic('home');
  }, [story]);

  // Sleep timer: the story gently stops and fades to a goodnight card.
  useEffect(() => {
    if (typeof sleepAt !== 'number') return;
    const id = setTimeout(() => setAsleep(true), Math.max(0, sleepAt - Date.now()));
    return () => clearTimeout(id);
  }, [sleepAt]);

  useEffect(() => {
    if (asleep) narration.setPlaying(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asleep]);

  const activeIndex = activeMarkAt(timeline.marks, narration.elapsedMs);
  const progress = Math.min(1, narration.elapsedMs / Math.max(1, audio.durationMs ?? timeline.durationMs));

  // Cloud stories arrive as bookshelf summaries; fetch pages (fresh signed URLs) on open.
  const [loadError, setLoadError] = useState(false);
  useEffect(() => {
    if (!story || story.pages.length || isOfflineDemo) return;
    import('../services/cloud')
      .then((c) => c.loadStory(story.id))
      .catch((e) => {
        console.warn('Could not open story', e);
        setLoadError(true);
      });
  }, [story]);

  useAlexaVoice({
    enabled: !!story && phase === 'reading' && settings.alexaVoice,
    title: story?.title ?? 'Storyloom',
    page: cursor + 1,
    total: knownTotal,
    playing: narration.playing,
    onPlay: () => narration.setPlaying(true),
    onPause: () => narration.setPlaying(false),
    onNext: goNext,
    onPrevious: goPrev,
    onRestart: narration.restart,
  });

  // Keep the phones in step with the TV.
  useEffect(() => {
    if (story && page) syncToRoom({ action: 'playback', storyId: story.id, page: cursor + 1, total: knownTotal });
  }, [story, page, cursor, knownTotal]);

  useEffect(() => {
    if (phase !== 'choice' || !story) return;
    useRoom.getState().resetVotes();
    syncToRoom({ action: 'choice.open', storyId: story.id, closesAt: Date.now() + 20000 });
  }, [phase, story]);

  useEffect(() => {
    activateKeepAwakeAsync('story').catch(() => {});
    return () => {
      deactivateKeepAwake('story').catch(() => {});
    };
  }, []);

  const showChrome = useCallback(() => {
    setChrome(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setChrome(false), 6000);
  }, []);

  useEffect(() => {
    showChrome();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [showChrome]);

  // While the controls are hidden, the remote works as shortcuts (like a streaming player).
  useRemoteKeys(
    (key) => {
      switch (key) {
        case RemoteKey.Right:
          goNext();
          break;
        case RemoteKey.Left:
          goPrev();
          break;
        case RemoteKey.Select:
          narration.toggle();
          showChrome();
          break;
        case RemoteKey.Back:
          break; // handled by the back handler below
        default:
          showChrome();
      }
    },
    phase === 'reading' && !chrome && !panel && !asleep,
  );

  // Media keys work whether or not the controls are showing.
  useRemoteKeys(
    (key) => {
      if (key === RemoteKey.PlayPause) narration.toggle();
      if (key === RemoteKey.FastForward) goNext();
      if (key === RemoteKey.Rewind) goPrev();
      if (chrome && key !== RemoteKey.Back) showChrome();
    },
    phase === 'reading' && !panel && !asleep,
  );

  // Any key while the controls are up keeps them up (Back hides them instead).
  useRemoteKeys((key) => key !== RemoteKey.Back && showChrome(), phase === 'reading' && chrome && !panel);

  useBackHandler(() => {
    if (asleep) {
      setAsleep(false);
      return true;
    }
    if (phase !== 'reading') {
      setPhase('reading');
      return true;
    }
    if (chrome) {
      // First Back hides the controls, the next one leaves the story.
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setChrome(false);
      sfx('back');
      return true;
    }
    sfx('back');
    return false;
  });

  const chromeFade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.timing(chromeFade, { toValue: chrome ? 1 : 0, duration: 380, easing: Easing.out(Easing.quad), useNativeDriver: native }).start();
  }, [chrome, chromeFade]);

  if (!story || !page) {
    return (
      <View style={[styles.screen, styles.center]}>
        <T variant="h2">{loadError ? t('player.loadError') : t('player.opening')}</T>
      </View>
    );
  }

  const imageSeed = `${story.id}-${page.index}${page.branch ?? ''}`;
  const code = TRACK_CODE[shownTrack] ?? story.language;
  const rtl = !!languageInfo(code).rtl;
  const sameText = shownTrack === audioTrack;
  const captionStyle = {
    fontFamily: CAPTION_FONT[settings.captionFont],
    fontSize: px(44) * CAPTION_SIZE[settings.captionSize] * (settings.largeText ? 1.12 : 1),
    lineHeight: px(64) * CAPTION_SIZE[settings.captionSize] * (settings.largeText ? 1.12 : 1),
    ...(settings.captionBackground === 'shadow' ? { textShadowColor: 'rgba(0,0,0,0.85)', textShadowRadius: 10, textShadowOffset: { width: 0, height: 2 } } : null),
  };
  const title = storyTitle(story, shownTrack === 'off' ? audioTrack : shownTrack);
  const choice = choiceText(story, shownTrack === 'off' ? audioTrack : shownTrack);

  const langOption = (k: string) => ({
    value: k,
    label: trackLabel(k),
    hint: languageInfo(TRACK_CODE[k]).english,
    badge: k === original ? t('player.original') : undefined,
  });

  return (
    <View style={styles.screen}>
      {settings.kenBurns && !settings.reduceMotion ? (
        <KenBurns pageKey={pageKey} durationMs={audio.durationMs ?? timeline.durationMs} direction={cursor % 2 === 0 ? 1 : -1}>
          <CrossfadeArt seed={imageSeed} uri={page.imageUrl} palette={story.palette} />
        </KenBurns>
      ) : (
        <CrossfadeArt seed={imageSeed} uri={page.imageUrl} palette={story.palette} />
      )}
      {!settings.reduceMotion ? <Motes mood={story.mood} /> : null}

      {bedtime ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.bedtime]} /> : null}
      <LinearGradient
        colors={['rgba(7,6,26,0.6)', 'rgba(7,6,26,0)', 'rgba(7,6,26,0)', 'rgba(7,6,26,0.78)', 'rgba(7,6,26,0.95)']}
        locations={[0, 0.2, 0.44, 0.72, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Captions (the story text), with the word being read lit up. */}
      {captionText ? (
        <View style={[styles.textWrap, settings.captionPosition === 'top' ? styles.textTop : chrome ? styles.textRaised : styles.textLow]}>
          <View style={settings.captionBackground === 'box' ? styles.captionBox : undefined}>
            <ReadAlongText
              text={captionText}
              marks={sameText ? timeline.marks : []}
              activeIndex={sameText ? activeIndex : -1}
              highlight={phase === 'reading' && sameText && settings.readAlong}
              style={captionStyle}
              mode={settings.highlightStyle}
              color={CAPTION_COLOR[settings.captionColor]}
              rtl={rtl}
            />
          </View>
        </View>
      ) : null}

      {/* Top bar */}
      <Animated.View pointerEvents="none" style={[styles.top, { opacity: chromeFade }]}>
        <View style={{ flex: 1 }}>
          <T variant="overline" color={colors.gold}>
            {story.hero.name.toUpperCase()} · {t('player.pageOf', { n: cursor + 1, total: Math.max(knownTotal, pages.length) })}
          </T>
          <T variant="h2" numberOfLines={1} style={{ marginTop: px(6) }}>
            {title}
          </T>
        </View>
        <View style={styles.chips}>
          <Chip icon="volume" label={trackLabel(audioTrack)} />
          {shownTrack !== 'off' && !sameText ? <Chip icon="subtitles" label={trackLabel(shownTrack)} /> : null}
          {speed !== 1 ? <Chip icon="speed" label={`${speed}×`} /> : null}
          {sleepAt ? <Chip icon="timer" label={sleepAt === 'end' ? t('player.sleepEnd') : t('player.sleepOn')} /> : null}
        </View>
      </Animated.View>

      {/* Transport bar */}
      {chrome && phase === 'reading' && !panel ? (
        <SpatialNavigationRoot isActive>
          <Animated.View style={[styles.bottom, { opacity: chromeFade }]}>
            <Progress total={pages.length} current={cursor} progress={progress} pending={hasChoiceAhead} />
            <SpatialNavigationView direction="horizontal" style={styles.transport}>
              <IconButton icon="back" label={t('player.exit')} onSelect={() => navigation.goBack()} />
              <View style={styles.gap} />
              <IconButton icon="prev" label={t('player.back')} onSelect={goPrev} />
              <DefaultFocus>
                <IconButton icon={narration.playing ? 'pause' : 'play'} label={narration.playing ? t('player.pause') : t('player.play')} size="lg" onSelect={narration.toggle} />
              </DefaultFocus>
              <IconButton icon="next" label={t('player.next')} onSelect={goNext} />
              <IconButton icon="refresh" label={t('player.restart')} onSelect={narration.restart} />
              <View style={styles.gap} />
              <IconButton icon="subtitles" label={t('player.audioSubs')} onSelect={() => setPanel('audio')} />
              <IconButton icon="sliders" label={t('player.playback')} onSelect={() => setPanel('playback')} />
              <IconButton icon="timer" label={t('player.sleep')} onSelect={() => setPanel('sleep')} active={!!sleepAt} />
            </SpatialNavigationView>
            <View style={styles.hints}>
              <Hint icon="left" label={t('player.hintPages')} />
              {alexaAvailable && settings.alexaVoice ? <Hint icon="mic" label={t('player.alexa')} /> : null}
            </View>
          </Animated.View>
        </SpatialNavigationRoot>
      ) : null}

      {panel === 'audio' ? (
        <SideSheet
          title={t('player.audioSubs')}
          subtitle={t('player.audioSubsHint')}
          onClose={() => setPanel(null)}
          columns={[
            { title: t('player.audio'), icon: 'volume', value: audioTrack, options: tracks.map(langOption), onPick: (v: string) => setAudioTrack(v) },
            {
              title: t('player.subtitles'),
              icon: 'subtitles',
              value: captionTrack,
              options: [
                { value: 'off', label: t('player.subsOff') },
                { value: 'same', label: t('player.subsSame'), hint: trackLabel(audioTrack) },
                ...subs.map(langOption),
              ],
              onPick: (v: string) => setCaptionTrack(v),
            },
          ]}
        />
      ) : null}

      {panel === 'playback' ? (
        <SideSheet
          title={t('player.playback')}
          onClose={() => setPanel(null)}
          columns={[
            {
              title: t('player.speed'),
              icon: 'speed',
              value: speed,
              options: SPEEDS.map((s) => ({ value: s, label: s === 1 ? t('player.speedNormal') : `${s}×` })),
              onPick: (v: number) => setSpeed(v),
            },
            {
              title: t('player.pages'),
              icon: 'book',
              value: readToMe ? 'auto' : 'manual',
              options: [
                { value: 'auto', label: t('player.readToMeShort'), hint: t('player.readToMeHint') },
                { value: 'manual', label: t('player.iReadShort'), hint: t('player.iReadHint') },
              ],
              onPick: (v: string) => setReadToMe(v === 'auto'),
            },
            {
              title: t('player.sound'),
              icon: 'music',
              value: settings.soundProfile,
              options: [
                { value: 'cinema', label: t('settings.sound.cinema'), hint: t('settings.sound.cinemaHint') },
                { value: 'clear', label: t('settings.sound.clear'), hint: t('settings.sound.clearHint') },
                { value: 'night', label: t('settings.sound.night'), hint: t('settings.sound.nightHint') },
              ],
              onPick: (v: 'cinema' | 'clear' | 'night') => useSettings.getState().update({ soundProfile: v }),
            },
          ]}
          width={px(1500)}
        />
      ) : null}

      {panel === 'sleep' ? (
        <SideSheet
          title={t('player.sleep')}
          subtitle={t('player.sleepHint')}
          onClose={() => setPanel(null)}
          columns={[
            {
              title: t('player.sleep'),
              icon: 'moon',
              value: sleepAt === null ? 'off' : sleepAt === 'end' ? 'end' : 'on',
              options: [
                { value: 'off', label: t('player.sleepOff') },
                { value: 5, label: t('player.minutes', { n: 5 }) },
                { value: 10, label: t('player.minutes', { n: 10 }) },
                { value: 15, label: t('player.minutes', { n: 15 }) },
                { value: 30, label: t('player.minutes', { n: 30 }) },
                { value: 'end', label: t('player.sleepEnd') },
              ],
              onPick: (v: string | number) => {
                setSleepAt(v === 'off' ? null : v === 'end' ? 'end' : Date.now() + Number(v) * 60_000);
                setPanel(null);
              },
            },
          ]}
        />
      ) : null}

      {phase === 'choice' && choice ? (
        <ChoiceOverlay
          story={story}
          choice={choice}
          onDecided={(winner) => {
            syncToRoom({ action: 'choice.decided', storyId: story.id, winner });
            setChosen(winner);
            useLibrary.getState().upsert({ ...story, chosen: winner });
            setPhase('reading');
            setCursor((c) => c + 1);
          }}
        />
      ) : null}

      {phase === 'end' && !asleep ? (
        <EndOverlay
          story={story}
          bedtime={bedtime}
          onReadAgain={() => {
            setChosen(undefined);
            setCursor(0);
            setPhase('reading');
          }}
          next={nextEpisode(story.id)}
          onNext={(id) => navigation.replace('Player', { storyId: id })}
          onNewStory={() => navigation.replace('Lobby', undefined)}
          onHome={() => navigation.popToTop()}
        />
      ) : null}

      {asleep ? <Goodnight onWake={() => setAsleep(false)} /> : null}
    </View>
  );
}

function Goodnight({ onWake }: { onWake: () => void }) {
  const t = useT();
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    playMusic('cozy');
    Animated.timing(fade, { toValue: 1, duration: 4000, useNativeDriver: native }).start();
  }, [fade]);
  useRemoteKeys(() => onWake());
  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.goodnight, { opacity: fade }]}>
      <Icon name="moon" size={px(96)} color={colors.gold} />
      <T variant="h1" style={{ marginTop: px(24) }}>
        {t('player.goodnight')}
      </T>
      <T variant="body" color={colors.dim} style={{ marginTop: px(10) }}>
        {t('player.wake')}
      </T>
    </Animated.View>
  );
}

function Chip({ icon, label }: { icon: 'volume' | 'subtitles' | 'speed' | 'timer'; label: string }) {
  return (
    <View style={styles.chip}>
      <Icon name={icon} size={px(22)} color={colors.gold} />
      <T variant="caption" color={colors.parchment} style={{ letterSpacing: 0 }}>
        {label}
      </T>
    </View>
  );
}

function Hint({ icon, label }: { icon: 'left' | 'mic'; label: string }) {
  return (
    <View style={styles.hint}>
      <Icon name={icon} size={px(22)} color={colors.dim} />
      <T variant="caption" color={colors.dim} style={{ letterSpacing: 0 }}>
        {label}
      </T>
    </View>
  );
}

/** One segment per page; the current one fills as the narrator reads. */
function Progress({ total, current, progress, pending }: { total: number; current: number; progress: number; pending: boolean }) {
  return (
    <View style={styles.progress}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={styles.segment}>
          <View style={[styles.segmentFill, { width: i < current ? '100%' : i === current ? `${Math.round(progress * 100)}%` : '0%' }]} />
        </View>
      ))}
      {pending ? (
        <View style={styles.pending}>
          <Icon name="sparkle" size={px(24)} color={colors.gold} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.night, overflow: 'hidden' },
  center: { alignItems: 'center', justifyContent: 'center' },
  top: {
    position: 'absolute',
    top: safe.y,
    left: safe.x,
    right: safe.x,
    flexDirection: 'row',
    alignItems: 'center',
    gap: px(40),
  },
  chips: { flexDirection: 'row', gap: px(12) },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: px(8),
    paddingHorizontal: px(16),
    paddingVertical: px(8),
    borderRadius: radius.pill,
    backgroundColor: 'rgba(7,6,26,0.6)',
    borderWidth: px(1.5),
    borderColor: 'rgba(245,198,107,0.35)',
  },
  textWrap: { position: 'absolute', left: safe.x + px(40), right: safe.x + px(40) },
  textLow: { bottom: px(120) },
  textRaised: { bottom: px(330) },
  textTop: { top: px(190) },
  captionBox: { backgroundColor: 'rgba(3,3,14,0.72)', borderRadius: radius.md, paddingHorizontal: px(28), paddingVertical: px(18) },
  bottom: { position: 'absolute', left: safe.x, right: safe.x, bottom: safe.y },
  transport: { flexDirection: 'row', alignItems: 'center', gap: px(26), marginTop: px(26) },
  gap: { width: px(30) },
  hints: { flexDirection: 'row', gap: px(36), marginTop: px(64) },
  hint: { flexDirection: 'row', alignItems: 'center', gap: px(8) },
  progress: { flexDirection: 'row', alignItems: 'center', gap: px(8) },
  segment: { flex: 1, height: px(8), borderRadius: px(4), backgroundColor: 'rgba(247,241,227,0.2)', overflow: 'hidden' },
  segmentFill: { height: '100%', backgroundColor: colors.gold },
  pending: { marginLeft: px(6) },
  bedtime: { backgroundColor: 'rgba(70, 36, 0, 0.22)' },
  goodnight: { backgroundColor: '#020109', alignItems: 'center', justifyContent: 'center', zIndex: 50 },
});
