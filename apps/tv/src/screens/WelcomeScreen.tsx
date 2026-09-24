import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { DefaultFocus, SpatialNavigationRoot, SpatialNavigationView } from 'react-tv-space-navigation';
import { languageInfo } from '@storyloom/protocol';
import { LanguageSheet } from '../components/LanguageSheet';
import { useT, type StringKey } from '../i18n';
import { Button } from '../components/Button';
import { Icon, IconName } from '../components/Icon';
import { Logo } from '../components/Logo';
import { SkyBackdrop } from '../components/sky/SkyBackdrop';
import { T } from '../components/Typography';
import { useSettings } from '../state/settings';
import { colors, px, radius } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;
const native = Platform.OS !== 'web';

const STEPS: { icon: IconName; title: StringKey; body: StringKey }[] = [
  { icon: 'phone', title: 'welcome.step1.title', body: 'welcome.step1.body' },
  { icon: 'brush', title: 'welcome.step2.title', body: 'welcome.step2.body' },
  { icon: 'sparkle', title: 'welcome.step3.title', body: 'welcome.step3.body' },
];

export function WelcomeScreen({ navigation }: Props) {
  const isFocused = useIsFocused();
  const t = useT();
  const language = useSettings((s) => s.language);
  const [choosing, setChoosing] = useState(false);
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
    <SpatialNavigationRoot isActive={isFocused && !choosing}>
      <View style={styles.screen}>
        <SkyBackdrop scrim="center" />
        <Animated.View
          style={[
            styles.center,
            { opacity: intro, transform: [{ translateY: intro.interpolate({ inputRange: [0, 1], outputRange: [px(30), 0] }) }] },
          ]}
        >
          <Logo size="lg" />
          <T variant="h2" color={colors.muted} align="center" style={{ marginTop: px(18) }}>
            {t('welcome.tagline')}
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
                {t(s.title)}
              </T>
              <T variant="body" color={colors.muted} align="center" style={{ marginTop: px(8) }}>
                {t(s.body)}
              </T>
            </Animated.View>
          ))}
        </View>

        <SpatialNavigationView direction="horizontal" style={styles.cta}>
          <DefaultFocus>
            <Button label={t('welcome.begin')} icon="sparkle" size="lg" onSelect={begin} />
          </DefaultFocus>
          <Button label={languageInfo(language).native} icon="globe" kind="ghost" size="lg" onSelect={() => setChoosing(true)} />
        </SpatialNavigationView>
        <T variant="caption" color={colors.dim} style={{ marginTop: px(22) }}>
          {t('welcome.promise')}
        </T>
      </View>
      {choosing ? (
        <LanguageSheet
          selected={language}
          onClose={() => setChoosing(false)}
          onPick={(code) => {
            useSettings.getState().update({ language: code });
            setChoosing(false);
          }}
        />
      ) : null}
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
  cta: { flexDirection: 'row', alignItems: 'center', gap: px(28), marginTop: px(72) },
});
