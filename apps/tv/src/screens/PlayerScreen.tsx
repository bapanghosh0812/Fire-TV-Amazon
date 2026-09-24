import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Story, StoryPage } from '@storyloom/protocol';
import { CrossfadeArt } from '../components/StoryArt';
import { Icon } from '../components/Icon';
import { T } from '../components/Typography';
import { KenBurns } from '../player/KenBurns';
import { ReadAlongText } from '../player/ReadAlongText';
import { activeMarkAt, buildTimeline } from '../player/readAlong';
import { useNarration } from '../player/useNarration';
import { alexaAvailable, useAlexaVoice } from '../player/useAlexaVoice';
import { ChoiceOverlay } from '../player/ChoiceOverlay';
import { EndOverlay } from '../player/EndOverlay';
import { useBackHandler, useRemoteKeys } from '../remote/hooks';
import { RemoteKey } from '../remote/keys';
import { useLibrary } from '../state/library';
import { useRoom } from '../state/room';
import { useSettings } from '../state/settings';
import { isOfflineDemo } from '../services/config';
import { syncToRoom } from '../services/session';
import { colors, px, radius, safe } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Player'>;
type Phase = 'reading' | 'choice' | 'end';

const native = Platform.OS !== 'web';

function pathFor(story: Story, chosen?: 'a' | 'b'): StoryPage[] {
  const cut = story.choice?.afterPage;
  return story.pages
    .filter((p) => (chosen ? !p.branch || p.branch === chosen : cut === undefined || (!p.branch && p.index <= cut)))
    .sort((a, b) => a.index - b.index);
}

export function PlayerScreen({ route, navigation }: Props) {
  const story = useLibrary((s) => s.stories.find((x) => x.id === route.params.storyId));
  const [chosen, setChosen] = useState<'a' | 'b' | undefined>(story?.chosen);
  const [cursor, setCursor] = useState(0);
  const [phase, setPhase] = useState<Phase>('reading');
  const [chromeVisible, setChromeVisible] = useState(true);
  const [readToMe, setReadToMe] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const pages = useMemo(() => (story ? pathFor(story, chosen) : []), [story, chosen]);
  const page = pages[cursor];
  const hasChoiceAhead = !!story?.choice && !chosen;
  const knownTotal = story ? new Set(story.pages.map((p) => p.index)).size : 0;

  const timeline = useMemo(() => buildTimeline(page?.text ?? '', page?.marks), [page]);
  const pageKey = `${story?.id}-${page?.index}-${page?.branch ?? ''}`;

  const goNext = useCallback(() => {
    if (!story) return;
    if (cursor < pages.length - 1) {
      setCursor((c) => c + 1);
      return;
    }
    if (hasChoiceAhead) setPhase('choice');
    else setPhase('end');
  }, [cursor, pages.length, hasChoiceAhead, story]);

  const goPrev = useCallback(() => setCursor((c) => Math.max(0, c - 1)), []);

  const bedtime = useSettings((s) => s.bedtimeMode);
  const sleepMinutes = useSettings((s) => s.sleepTimerMin);
  const [asleep, setAsleep] = useState(false);

  const narration = useNarration({
    pageKey,
    audioUrl: page?.audioUrl,
    durationMs: page?.durationMs ?? timeline.durationMs,
    autoplay: phase === 'reading' && !asleep,
    rate: bedtime ? 0.92 : 1,
    onFinished: () => {
      if (readToMe) setTimeout(goNext, bedtime ? 2200 : 1400);
    },
  });

  // Sleep timer: the story gently stops and the screen fades to a goodnight card.
  useEffect(() => {
    if (!sleepMinutes) return;
    const t = setTimeout(() => setAsleep(true), sleepMinutes * 60_000);
    return () => clearTimeout(t);
  }, [sleepMinutes]);

  useEffect(() => {
    if (asleep) narration.setPlaying(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asleep]);

  const activeIndex = activeMarkAt(timeline.marks, narration.elapsedMs);

  // Cloud stories arrive as bookshelf summaries; fetch pages (fresh signed URLs) on open.
  const [loadError, setLoadError] = useState<string>();
  useEffect(() => {
    if (!story || story.pages.length || isOfflineDemo) return;
    import('../services/cloud')
      .then((c) => c.loadStory(story.id))
      .catch((e) => setLoadError(e instanceof Error ? e.message : 'Could not open this story'));
  }, [story]);

  useAlexaVoice({
    enabled: !!story && phase === 'reading',
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

  // Keep the TV awake while a story is on screen.
  useEffect(() => {
    activateKeepAwakeAsync('story').catch(() => {});
    return () => {
      deactivateKeepAwake('story').catch(() => {});
    };
  }, []);

  const pokeChrome = useCallback(() => {
    setChromeVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setChromeVisible(false), 4500);
  }, []);

  useEffect(() => {
    pokeChrome();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [pokeChrome]);

  useRemoteKeys(
    (key) => {
      pokeChrome();
      switch (key) {
        case RemoteKey.Right:
        case RemoteKey.FastForward:
          goNext();
          break;
        case RemoteKey.Left:
        case RemoteKey.Rewind:
          goPrev();
          break;
        case RemoteKey.Select:
        case RemoteKey.PlayPause:
          narration.toggle();
          break;
        case RemoteKey.Down:
          setReadToMe((v) => !v);
          break;
      }
    },
    phase === 'reading',
  );

  useBackHandler(() => {
    if (asleep) {
      setAsleep(false);
      return true;
    }
    if (phase !== 'reading') {
      setPhase('reading');
      return true;
    }
    return false;
  });

  const chromeOpacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.timing(chromeOpacity, { toValue: chromeVisible || !narration.playing ? 1 : 0, duration: 400, useNativeDriver: native }).start();
  }, [chromeVisible, narration.playing, chromeOpacity]);

  if (!story || !page) {
    return (
      <View style={[styles.screen, styles.center]}>
        <T variant="h2">{loadError ?? 'Opening the book…'}</T>
      </View>
    );
  }

  const imageSeed = `${story.id}-${page.index}${page.branch ?? ''}`;

  return (
    <View style={styles.screen}>
      <KenBurns pageKey={pageKey} durationMs={timeline.durationMs} direction={cursor % 2 === 0 ? 1 : -1}>
        <CrossfadeArt seed={imageSeed} uri={page.imageUrl} palette={story.palette} />
      </KenBurns>

      {bedtime ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.bedtime]} /> : null}
      <LinearGradient
        colors={['rgba(7,6,26,0.55)', 'rgba(7,6,26,0)', 'rgba(7,6,26,0)', 'rgba(7,6,26,0.82)', 'rgba(7,6,26,0.96)']}
        locations={[0, 0.18, 0.45, 0.72, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Top chrome: title + page thread */}
      <Animated.View style={[styles.top, { opacity: chromeOpacity }]}>
        <View style={{ flex: 1 }}>
          <T variant="overline" color={colors.gold}>
            {story.hero.name.toUpperCase()} · PAGE {cursor + 1}
          </T>
          <T variant="h3" numberOfLines={1} style={{ marginTop: px(6) }}>
            {story.title}
          </T>
        </View>
        <PageThread total={knownTotal} current={cursor} pending={hasChoiceAhead} />
      </Animated.View>

      {/* Story text */}
      <View style={styles.textWrap}>
        <ReadAlongText text={page.text} marks={timeline.marks} activeIndex={activeIndex} highlight={phase === 'reading'} />
      </View>

      {/* Bottom chrome: controls hint */}
      <Animated.View style={[styles.controls, { opacity: chromeOpacity }]}>
        <ControlHint icon="left" label="Back a page" />
        <View style={styles.playBadge}>
          <Icon name={narration.playing ? 'pause' : 'play'} size={px(30)} color={colors.night} />
        </View>
        <ControlHint icon="right" label="Next page" />
        <View style={styles.sep} />
        <ControlHint icon={readToMe ? 'volume' : 'book'} label={readToMe ? 'Read to me · ▼ to read myself' : 'I’ll read · ▼ for read to me'} />
        {alexaAvailable ? (
          <>
            <View style={styles.sep} />
            <ControlHint icon="mic" label="Say “Alexa, next” or “Alexa, pause”" />
          </>
        ) : null}
      </Animated.View>

      {phase === 'choice' && story.choice ? (
        <ChoiceOverlay
          story={story}
          choice={story.choice}
          onDecided={(winner) => {
            syncToRoom({ action: 'choice.decided', storyId: story.id, winner });
            setChosen(winner);
            useLibrary.getState().upsert({ ...story, chosen: winner });
            setPhase('reading');
            setCursor((c) => c + 1);
          }}
        />
      ) : null}

      {phase === 'end' ? (
        <EndOverlay
          story={story}
          bedtime={bedtime}
          onReadAgain={() => {
            setChosen(undefined);
            setCursor(0);
            setPhase('reading');
          }}
          onNewStory={() => navigation.replace('Lobby', undefined)}
          onHome={() => navigation.popToTop()}
        />
      ) : null}

      {asleep ? <Goodnight onWake={() => setAsleep(false)} /> : null}
    </View>
  );
}

function Goodnight({ onWake }: { onWake: () => void }) {
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 4000, useNativeDriver: native }).start();
  }, [fade]);
  useRemoteKeys(() => onWake());
  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.goodnight, { opacity: fade }]}>
      <Icon name="moon" size={px(96)} color={colors.gold} />
      <T variant="h1" style={{ marginTop: px(24) }}>
        Goodnight
      </T>
      <T variant="body" color={colors.dim} style={{ marginTop: px(10) }}>
        Press any button to keep reading
      </T>
    </Animated.View>
  );
}

function ControlHint({ icon, label }: { icon: 'left' | 'right' | 'volume' | 'book' | 'mic'; label: string }) {
  return (
    <View style={styles.hint}>
      <Icon name={icon} size={px(24)} color={colors.muted} />
      <T variant="caption" color={colors.muted}>
        {label}
      </T>
    </View>
  );
}

function PageThread({ total, current, pending }: { total: number; current: number; pending: boolean }) {
  const count = Math.max(total, current + 1);
  return (
    <View style={styles.thread}>
      {Array.from({ length: count }).map((_, i) => (
        <React.Fragment key={i}>
          {i > 0 ? <View style={[styles.threadLine, i <= current && styles.threadLineDone]} /> : null}
          <View style={[styles.knot, i < current && styles.knotDone, i === current && styles.knotNow]} />
        </React.Fragment>
      ))}
      {pending ? (
        <>
          <View style={[styles.threadLine, styles.threadDashed]} />
          <Icon name="sparkle" size={px(24)} color={colors.gold} />
        </>
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
  textWrap: {
    position: 'absolute',
    left: safe.x + px(40),
    right: safe.x + px(40),
    bottom: px(170),
  },
  controls: {
    position: 'absolute',
    left: safe.x + px(40),
    bottom: safe.y + px(10),
    flexDirection: 'row',
    alignItems: 'center',
    gap: px(28),
  },
  hint: { flexDirection: 'row', alignItems: 'center', gap: px(8) },
  playBadge: {
    width: px(64),
    height: px(64),
    borderRadius: px(32),
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sep: { width: px(2), height: px(34), backgroundColor: colors.line },
  bedtime: { backgroundColor: 'rgba(70, 36, 0, 0.22)' },
  goodnight: { backgroundColor: '#020109', alignItems: 'center', justifyContent: 'center', zIndex: 50 },
  thread: { flexDirection: 'row', alignItems: 'center' },
  threadLine: { width: px(34), height: px(3), backgroundColor: 'rgba(247,241,227,0.25)' },
  threadLineDone: { backgroundColor: colors.gold },
  threadDashed: { backgroundColor: 'transparent', borderTopWidth: px(3), borderStyle: 'dashed', borderColor: 'rgba(245,198,107,0.6)', height: 0 },
  knot: { width: px(16), height: px(16), borderRadius: px(8), backgroundColor: 'rgba(247,241,227,0.3)' },
  knotDone: { backgroundColor: colors.gold },
  knotNow: { width: px(24), height: px(24), borderRadius: px(12), backgroundColor: colors.goldBright, borderWidth: px(4), borderColor: 'rgba(245,198,107,0.35)' },
});
