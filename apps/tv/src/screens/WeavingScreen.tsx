import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { WeaveStage } from '@storyloom/protocol';
import { Icon } from '../components/Icon';
import { LogoMark } from '../components/Logo';
import { Starfield } from '../components/Starfield';
import { T } from '../components/Typography';
import { useRoom } from '../state/room';
import { useWeave } from '../state/weave';
import { colors, px, radius, safe } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/types';
import { THREAD_COLORS } from '@storyloom/protocol';

type Props = NativeStackScreenProps<RootStackParamList, 'Weaving'>;
const native = Platform.OS !== 'web';

const STAGES: { id: WeaveStage; label: string }[] = [
  { id: 'plan', label: 'Plan' },
  { id: 'write', label: 'Write' },
  { id: 'paint', label: 'Paint' },
  { id: 'voice', label: 'Narrate' },
  { id: 'safety', label: 'Safety check' },
];
const ORDER: WeaveStage[] = ['plan', 'hero', 'write', 'paint', 'voice', 'safety', 'done'];

export function WeavingScreen({ navigation, route }: Props) {
  const { stage, message, pct, error } = useWeave();
  const players = useRoom((s) => s.players);
  const { width } = useWindowDimensions();
  const flow = useRef(new Animated.Value(0)).current;
  const pctAnim = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;

  const threadColors = useMemo(() => {
    const cs = players.map((p) => p.color);
    return cs.length >= 3 ? cs : [...cs, ...THREAD_COLORS].slice(0, Math.max(3, cs.length));
  }, [players]);

  useEffect(() => {
    const loop = Animated.loop(Animated.timing(flow, { toValue: 1, duration: 3200, easing: Easing.linear, useNativeDriver: native }));
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
        Animated.timing(breathe, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
      ]),
    );
    loop.start();
    pulse.start();
    return () => {
      loop.stop();
      pulse.stop();
    };
  }, [flow, breathe]);

  useEffect(() => {
    Animated.timing(pctAnim, { toValue: pct, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [pct, pctAnim]);

  useEffect(() => {
    if (stage !== 'done') return;
    const t = setTimeout(() => navigation.replace('Player', { storyId: route.params.storyId }), 1200);
    return () => clearTimeout(t);
  }, [stage, navigation, route.params.storyId]);

  const wave = (amp: number, len: number, phase: number) => {
    const W = width * 2;
    const H = px(260);
    let d = `M0 ${H / 2}`;
    for (let x = 0; x <= W; x += 20) {
      const y = H / 2 + Math.sin((x / len) * Math.PI * 2 + phase) * amp;
      d += ` L${x} ${y.toFixed(1)}`;
    }
    return d;
  };

  const translateX = flow.interpolate({ inputRange: [0, 1], outputRange: [0, -px(480)] });
  const glowScale = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const barWidth = pctAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const currentIdx = ORDER.indexOf(stage);

  return (
    <View style={styles.screen}>
      <LinearGradient colors={['#15103F', colors.night]} style={StyleSheet.absoluteFill} />
      <Starfield density={110} />

      <View style={styles.loom}>
        <Animated.View style={{ transform: [{ translateX }] }}>
          <Svg width={width * 2} height={px(260)}>
            {threadColors.map((c, i) => (
              <Path key={i} d={wave(px(40 + i * 14), px(480), i * 1.3)} stroke={c} strokeWidth={px(5)} fill="none" strokeLinecap="round" opacity={0.85} />
            ))}
          </Svg>
        </Animated.View>
        <Animated.View style={[styles.core, { transform: [{ scale: glowScale }] }]}>
          <View style={styles.coreHalo} />
          <LogoMark size={px(150)} />
        </Animated.View>
      </View>

      <View style={styles.text}>
        <T variant="overline" color={colors.gold}>
          {error ? 'SOMETHING WENT WRONG' : 'WEAVING YOUR STORY'}
        </T>
        <T variant="h1" align="center" style={{ marginTop: px(12) }}>
          {error ?? message ?? 'Gathering everyone’s threads…'}
        </T>
        <View style={styles.bar}>
          <Animated.View style={[styles.barFill, { width: barWidth }]} />
        </View>
        <View style={styles.stages}>
          {STAGES.map((s) => {
            const idx = ORDER.indexOf(s.id);
            const done = currentIdx > idx;
            const now = currentIdx === idx;
            return (
              <View key={s.id} style={[styles.stage, now && styles.stageNow]}>
                {done ? (
                  <Icon name="check" size={px(22)} color={colors.teal} strokeWidth={3} />
                ) : (
                  <View style={[styles.dot, now && { backgroundColor: colors.gold }]} />
                )}
                <T variant="caption" color={done ? colors.teal : now ? colors.parchment : colors.dim}>
                  {s.label.toUpperCase()}
                </T>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.night, alignItems: 'center' },
  loom: { marginTop: px(170), height: px(260), width: '100%', justifyContent: 'center', alignItems: 'center' },
  core: {
    position: 'absolute',
    width: px(240),
    height: px(240),
    borderRadius: px(120),
    backgroundColor: colors.ink,
    borderWidth: px(3),
    borderColor: 'rgba(245,198,107,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coreHalo: {
    position: 'absolute',
    width: px(320),
    height: px(320),
    borderRadius: px(160),
    borderWidth: px(24),
    borderColor: 'rgba(245,198,107,0.12)',
  },
  text: { alignItems: 'center', marginTop: px(90), paddingHorizontal: safe.x, width: px(1500) },
  bar: { marginTop: px(40), width: px(820), height: px(8), borderRadius: px(4), backgroundColor: 'rgba(247,241,227,0.12)', overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: colors.gold, borderRadius: px(4) },
  stages: { flexDirection: 'row', gap: px(18), marginTop: px(40) },
  stage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: px(10),
    paddingHorizontal: px(20),
    height: px(50),
    borderRadius: radius.pill,
    borderWidth: px(1.5),
    borderColor: colors.line,
  },
  stageNow: { borderColor: colors.gold, backgroundColor: 'rgba(245,198,107,0.1)' },
  dot: { width: px(12), height: px(12), borderRadius: px(6), backgroundColor: colors.dim },
});
