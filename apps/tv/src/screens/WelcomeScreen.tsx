import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { DefaultFocus, SpatialNavigationRoot } from 'react-tv-space-navigation';
import { Button } from '../components/Button';
import { Icon, IconName } from '../components/Icon';
import { Logo } from '../components/Logo';
import { Starfield } from '../components/Starfield';
import { T } from '../components/Typography';
import { useSettings } from '../state/settings';
import { colors, px, radius } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;
const native = Platform.OS !== 'web';

const STEPS: { icon: IconName; title: string; body: string }[] = [
  { icon: 'phone', title: 'Everyone joins', body: 'Scan the code on the TV with any phone. No app to install.' },
  { icon: 'brush', title: 'Draw, speak, choose', body: 'A drawing becomes the hero. Say where it happens. Vote on what’s next.' },
  { icon: 'sparkle', title: 'Watch it come alive', body: 'An illustrated, narrated story that’s yours to keep and re-read.' },
];

export function WelcomeScreen({ navigation }: Props) {
  const isFocused = useIsFocused();
  const intro = useRef(new Animated.Value(0)).current;
  const steps = useRef(STEPS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(intro, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: native }),
      Animated.stagger(
        160,
        steps.map((v) => Animated.timing(v, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: native })),
      ),
    ]).start();
  }, [intro, steps]);

  const begin = () => {
    useSettings.getState().update({ onboarded: true });
    navigation.replace('Home');
  };

  return (
    <SpatialNavigationRoot isActive={isFocused}>
      <View style={styles.screen}>
        <LinearGradient colors={['#1A1454', colors.night]} locations={[0, 0.8]} style={StyleSheet.absoluteFill} />
        <Starfield density={120} />
        <Animated.View
          style={[
            styles.center,
            { opacity: intro, transform: [{ translateY: intro.interpolate({ inputRange: [0, 1], outputRange: [px(30), 0] }) }] },
          ]}
        >
          <Logo size="lg" />
          <T variant="h2" color={colors.muted} align="center" style={{ marginTop: px(18) }}>
            Family stories, woven together.
          </T>
        </Animated.View>

        <View style={styles.steps}>
          {STEPS.map((s, i) => (
            <Animated.View
              key={s.title}
              style={[
                styles.step,
                { opacity: steps[i], transform: [{ translateY: steps[i].interpolate({ inputRange: [0, 1], outputRange: [px(24), 0] }) }] },
              ]}
            >
              <View style={styles.stepNum}>
                <T variant="overline" color={colors.night}>
                  {i + 1}
                </T>
              </View>
              <View style={styles.stepIcon}>
                <Icon name={s.icon} size={px(44)} color={colors.gold} />
              </View>
              <T variant="h3" align="center">
                {s.title}
              </T>
              <T variant="body" color={colors.muted} align="center" style={{ marginTop: px(8) }}>
                {s.body}
              </T>
            </Animated.View>
          ))}
        </View>

        <View style={styles.cta}>
          <DefaultFocus>
            <Button label="Let’s begin" icon="sparkle" size="lg" onSelect={begin} />
          </DefaultFocus>
          <T variant="caption" color={colors.dim} style={{ marginTop: px(22) }}>
            MADE FOR FAMILIES · KID-SAFE AI · NO ADS
          </T>
        </View>
      </View>
    </SpatialNavigationRoot>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.night, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center' },
  steps: { flexDirection: 'row', gap: px(40), marginTop: px(80) },
  step: {
    width: px(460),
    alignItems: 'center',
    paddingVertical: px(40),
    paddingHorizontal: px(34),
    borderRadius: radius.lg,
    backgroundColor: 'rgba(23,20,58,0.72)',
    borderWidth: px(1.5),
    borderColor: colors.line,
  },
  stepNum: {
    position: 'absolute',
    top: px(20),
    left: px(20),
    width: px(40),
    height: px(40),
    borderRadius: px(20),
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIcon: {
    width: px(96),
    height: px(96),
    borderRadius: px(48),
    backgroundColor: 'rgba(245,198,107,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: px(22),
  },
  cta: { alignItems: 'center', marginTop: px(72) },
});
