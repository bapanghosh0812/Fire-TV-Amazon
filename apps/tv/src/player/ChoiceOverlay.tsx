import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { DefaultFocus, SpatialNavigationRoot, SpatialNavigationView } from 'react-tv-space-navigation';
import type { Story, StoryChoice } from '@storyloom/protocol';
import { Focusable } from '../components/Focusable';
import { StoryArt } from '../components/StoryArt';
import { Icon } from '../components/Icon';
import { AvatarStack } from '../components/Avatar';
import { T } from '../components/Typography';
import { useRoom } from '../state/room';
import { colors, px, radius } from '../theme/tokens';

const VOTE_SECONDS = 20;
const native = Platform.OS !== 'web';

interface Props {
  story: Story;
  choice: StoryChoice;
  onDecided: (winner: 'a' | 'b') => void;
}

export function ChoiceOverlay({ story, choice, onDecided }: Props) {
  const players = useRoom((s) => s.players);
  const remoteVotes = useRoom((s) => s.votes);
  const [tvVote, setTvVote] = useState<'a' | 'b' | undefined>();
  const [winner, setWinner] = useState<'a' | 'b' | undefined>();
  const countdown = useRef(new Animated.Value(1)).current;
  const appear = useRef(new Animated.Value(0)).current;

  const votes = useMemo(() => {
    const all: Record<string, 'a' | 'b'> = { ...remoteVotes };
    if (tvVote) all.tv = tvVote;
    return all;
  }, [remoteVotes, tvVote]);

  const tally = useMemo(() => {
    const t = { a: 0, b: 0 };
    Object.values(votes).forEach((v) => (t[v] += 1));
    return t;
  }, [votes]);

  const voters = (id: 'a' | 'b') =>
    Object.entries(votes)
      .filter(([, v]) => v === id)
      .map(([pid]) => (pid === 'tv' ? { name: 'TV', color: colors.gold } : players.find((p) => p.id === pid) ?? { name: '?', color: colors.dim }));

  useEffect(() => {
    Animated.spring(appear, { toValue: 1, useNativeDriver: native, speed: 14, bounciness: 5 }).start();
    Animated.timing(countdown, { toValue: 0, duration: VOTE_SECONDS * 1000, useNativeDriver: false }).start(({ finished }) => {
      if (finished) decide();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Everyone in the room has voted: no need to wait for the timer.
  useEffect(() => {
    const expected = players.length + 1;
    if (!winner && Object.keys(votes).length >= expected && tvVote) decide();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [votes]);

  const decidedRef = useRef(false);
  function decide() {
    if (decidedRef.current) return;
    decidedRef.current = true;
    countdown.stopAnimation();
    const t = { a: 0, b: 0 };
    Object.values(votesRef.current).forEach((v) => (t[v] += 1));
    const w: 'a' | 'b' = t.a === t.b ? (votesRef.current.tv ?? (Math.random() < 0.5 ? 'a' : 'b')) : t.a > t.b ? 'a' : 'b';
    setWinner(w);
    setTimeout(() => onDecided(w), 1900);
  }
  const votesRef = useRef(votes);
  votesRef.current = votes;

  const barWidth = countdown.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <SpatialNavigationRoot isActive={!winner}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.wrap, { opacity: appear }]}>
        <LinearGradient colors={['rgba(7,6,26,0.78)', 'rgba(7,6,26,0.94)']} style={StyleSheet.absoluteFill} />
        <View style={styles.header}>
          <View style={styles.badge}>
            <Icon name="sparkle" size={px(24)} color={colors.night} />
            <T variant="overline" color={colors.night}>
              THE FAMILY DECIDES
            </T>
          </View>
          <T variant="h1" align="center" style={{ marginTop: px(24) }}>
            {winner ? 'The story continues…' : choice.prompt}
          </T>
          <T variant="body" color={colors.muted} align="center" style={{ marginTop: px(10) }}>
            {winner ? ' ' : 'Vote on your phone, or choose with the remote'}
          </T>
        </View>

        <SpatialNavigationView direction="horizontal" style={styles.options}>
          {choice.options.map((opt, i) => {
            const isWinner = winner === opt.id;
            const isLoser = !!winner && !isWinner;
            const card = (
              <Focusable key={opt.id} onSelect={() => !winner && setTvVote(opt.id)} radius={radius.lg} scale={1.05}>
                {(focused) => (
                  <View style={[styles.card, isLoser && { opacity: 0.35 }]}>
                    <View style={styles.cardArt}>
                      <StoryArt seed={`${story.id}-choice-${opt.id}`} uri={opt.imageUrl} palette={story.palette} />
                      <LinearGradient colors={['rgba(7,6,26,0)', 'rgba(7,6,26,0.9)']} locations={[0.35, 1]} style={StyleSheet.absoluteFill} />
                      <View style={[styles.letter, (focused || isWinner) && { backgroundColor: colors.gold }]}>
                        <T variant="h3" color={focused || isWinner ? colors.night : colors.parchment}>
                          {opt.id.toUpperCase()}
                        </T>
                      </View>
                      {isWinner ? (
                        <View style={styles.winner}>
                          <Icon name="check" size={px(34)} color={colors.night} strokeWidth={3} />
                        </View>
                      ) : null}
                    </View>
                    <View style={styles.cardBody}>
                      <T variant="h2" numberOfLines={2}>
                        {opt.label}
                      </T>
                      <View style={styles.voteRow}>
                        <AvatarStack people={voters(opt.id)} size={px(40)} />
                        <T variant="bodyStrong" color={colors.gold}>
                          {tally[opt.id]} {tally[opt.id] === 1 ? 'vote' : 'votes'}
                        </T>
                      </View>
                    </View>
                  </View>
                )}
              </Focusable>
            );
            return i === 0 ? <DefaultFocus key={opt.id}>{card}</DefaultFocus> : card;
          })}
        </SpatialNavigationView>

        {!winner ? (
          <View style={styles.timer}>
            <Animated.View style={[styles.timerFill, { width: barWidth }]} />
          </View>
        ) : null}
      </Animated.View>
    </SpatialNavigationRoot>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  header: { alignItems: 'center', width: px(1400) },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: px(10),
    backgroundColor: colors.gold,
    paddingHorizontal: px(22),
    height: px(48),
    borderRadius: radius.pill,
  },
  options: { flexDirection: 'row', gap: px(64), marginTop: px(56) },
  card: { width: px(660), backgroundColor: colors.surface },
  cardArt: { height: px(330) },
  letter: {
    position: 'absolute',
    top: px(22),
    left: px(22),
    width: px(60),
    height: px(60),
    borderRadius: px(30),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(7,6,26,0.65)',
  },
  winner: {
    position: 'absolute',
    top: px(22),
    right: px(22),
    width: px(64),
    height: px(64),
    borderRadius: px(32),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gold,
  },
  cardBody: { padding: px(30), gap: px(18) },
  voteRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: px(44) },
  timer: {
    marginTop: px(56),
    width: px(900),
    height: px(8),
    borderRadius: px(4),
    backgroundColor: 'rgba(247,241,227,0.12)',
    overflow: 'hidden',
  },
  timerFill: { height: '100%', backgroundColor: colors.gold, borderRadius: px(4) },
});
