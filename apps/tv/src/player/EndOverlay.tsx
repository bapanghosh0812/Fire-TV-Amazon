import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { DefaultFocus, SpatialNavigationRoot, SpatialNavigationView } from 'react-tv-space-navigation';
import type { Story } from '@storyloom/protocol';
import { Button } from '../components/Button';
import { AvatarStack } from '../components/Avatar';
import { Icon } from '../components/Icon';
import { T } from '../components/Typography';
import { colors, fonts, px, radius } from '../theme/tokens';
import { useT } from '../i18n';

const native = Platform.OS !== 'web';

interface Props {
  story: Story;
  bedtime?: boolean;
  next?: Story; // the next episode of a series, played automatically after a short countdown
  onNext?: (id: string) => void;
  onReadAgain: () => void;
  onNewStory: () => void;
  onHome: () => void;
}

const COUNTDOWN = 10;

export function EndOverlay({ story, bedtime, next, onNext, onReadAgain, onNewStory, onHome }: Props) {
  const t = useT();
  const appear = useRef(new Animated.Value(0)).current;
  const original = story.contributors.length === 0; // a Storyloom Original, not woven by the family
  // Streaming-style: the next episode starts on its own unless someone picks another button.
  const [left, setLeft] = useState<number | null>(next && !bedtime ? COUNTDOWN : null);

  useEffect(() => {
    Animated.timing(appear, { toValue: 1, duration: 900, useNativeDriver: native }).start();
  }, [appear]);

  useEffect(() => {
    if (left === null || !next) return;
    if (left <= 0) {
      onNext?.(next.id);
      return;
    }
    const id = setTimeout(() => setLeft((s) => (s === null ? null : s - 1)), 1000);
    return () => clearTimeout(id);
  }, [left, next, onNext]);
  const stopCountdown = () => setLeft(null);

  const rise = appear.interpolate({ inputRange: [0, 1], outputRange: [px(40), 0] });

  return (
    <SpatialNavigationRoot isActive>
      <Animated.View style={[StyleSheet.absoluteFill, styles.wrap, { opacity: appear }]}>
        <LinearGradient colors={['rgba(7,6,26,0.7)', 'rgba(7,6,26,0.97)']} style={StyleSheet.absoluteFill} />
        <Animated.View style={[styles.center, { transform: [{ translateY: rise }] }]}>
          <Icon name={bedtime ? 'moon' : 'sparkle'} size={px(64)} color={colors.gold} />
          <T style={styles.theEnd}>{bedtime ? t('end.sweetDreams') : t('end.theEnd')}</T>
          <T variant="h3" color={colors.muted} align="center">
            {story.title}
          </T>
          {original ? (
            <View style={styles.saved}>
              <Icon name="sparkle" size={px(24)} color={colors.gold} />
              <T variant="caption" color={colors.gold}>
                {t('end.original')}
              </T>
            </View>
          ) : (
            <>
              <View style={styles.credits}>
                <AvatarStack people={story.contributors} size={px(52)} />
                <T variant="body" color={colors.parchment}>
                  {t('end.credits', { names: story.contributors.map((c) => c.name).join(', ') })}
                </T>
              </View>
              <View style={styles.saved}>
                <Icon name="check" size={px(24)} color={colors.teal} strokeWidth={3} />
                <T variant="caption" color={colors.teal}>
                  {t('end.saved')}
                </T>
              </View>
            </>
          )}
          {next ? (
            <T variant="body" color={colors.muted} align="center" style={{ marginTop: px(12) }}>
              {left !== null ? t('end.nextIn', { title: next.title, s: left }) : t('end.nextUp', { title: next.title })}
            </T>
          ) : null}
          <SpatialNavigationView direction="horizontal" style={styles.actions}>
            {next ? (
              <DefaultFocus>
                <Button label={t('end.nextEpisode')} icon="play" size="lg" onSelect={() => onNext?.(next.id)} />
              </DefaultFocus>
            ) : null}
            {next ? (
              <Button label={t('end.again')} icon="refresh" kind="ghost" size="lg" onFocus={stopCountdown} onSelect={onReadAgain} />
            ) : (
              <DefaultFocus>
                <Button label={t('end.again')} icon="refresh" size="lg" onSelect={onReadAgain} />
              </DefaultFocus>
            )}
            {original ? null : <Button label={t('end.new')} icon="sparkle" kind="ghost" size="lg" onFocus={stopCountdown} onSelect={onNewStory} />}
            <Button label={t('end.home')} icon="home" kind="ghost" size="lg" onFocus={stopCountdown} onSelect={onHome} />
          </SpatialNavigationView>
        </Animated.View>
      </Animated.View>
    </SpatialNavigationRoot>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', gap: px(18) },
  theEnd: { fontFamily: fonts.displayItalic, fontSize: px(150), lineHeight: px(170), color: colors.parchment },
  credits: { flexDirection: 'row', alignItems: 'center', gap: px(18), marginTop: px(24) },
  saved: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: px(10),
    paddingHorizontal: px(20),
    height: px(44),
    borderRadius: radius.pill,
    backgroundColor: 'rgba(63,208,201,0.12)',
  },
  actions: { flexDirection: 'row', gap: px(28), marginTop: px(40) },
});
