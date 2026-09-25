import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { DefaultFocus, SpatialNavigationRoot, SpatialNavigationView } from 'react-tv-space-navigation';
import { Focusable } from '../components/Focusable';
import { Icon } from '../components/Icon';
import { Logo } from '../components/Logo';
import { ScreenHeader } from '../components/ScreenHeader';
import { T } from '../components/Typography';
import { StepDots } from '../components/Form';
import { useSky } from '../components/sky/skyState';
import { sfx } from '../audio/director';
import { UI_LANGUAGES, useT } from '../i18n';
import { continueOnboarding } from '../navigation/onboarding';
import { useSettings } from '../state/settings';
import { colors, px, radius, safe } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Language'>;
const native = Platform.OS !== 'web';

// "Choose your language" in every menu language, drifting under the title.
const GREETINGS = ['Choose your language', 'अपनी भाषा चुनें', 'Elige tu idioma', 'Choisissez votre langue', 'Wähle deine Sprache', 'Escolha seu idioma', '言語を選んでください'];

export function LanguageScreen({ navigation, route }: Props) {
  useSky('center');
  const t = useT();
  const isFocused = useIsFocused();
  const fromSettings = !!route.params?.fromSettings;
  const current = useSettings((s) => s.language);
  const [greeting, setGreeting] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;
  const intro = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(intro, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: native }).start();
    const id = setInterval(() => {
      Animated.timing(fade, { toValue: 0, duration: 400, useNativeDriver: native }).start(() => {
        setGreeting((g) => (g + 1) % GREETINGS.length);
        Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: native }).start();
      });
    }, 2600);
    return () => clearInterval(id);
  }, [fade, intro]);

  const pick = (code: string, story: string) => {
    sfx('select');
    const s = useSettings.getState();
    // The first choice also sets the story language; later changes leave stories alone.
    s.update({ language: code, languageChosen: true, ...(s.languageChosen ? null : { storyLanguage: story }) });
    if (fromSettings) navigation.goBack();
    else continueOnboarding();
  };

  return (
    <SpatialNavigationRoot isActive={isFocused}>
      <View style={styles.screen}>
        <ScreenHeader onBack={fromSettings ? () => navigation.goBack() : undefined} right={fromSettings ? null : <StepDots steps={[t('onb.step.language'), t('onb.step.signin'), t('onb.step.family'), t('onb.step.promise')]} current={0} />} />
        <Animated.View style={[styles.head, { opacity: intro, transform: [{ translateY: intro.interpolate({ inputRange: [0, 1], outputRange: [px(24), 0] }) }] }]}>
          {!fromSettings ? <Logo size="md" /> : null}
          <T variant="hero" align="center" style={{ marginTop: px(26) }}>
            {t('lang.title')}
          </T>
          <Animated.View style={{ opacity: fade, marginTop: px(10) }}>
            <T variant="h3" color={colors.gold} align="center">
              {GREETINGS[greeting]}
            </T>
          </Animated.View>
        </Animated.View>

        <SpatialNavigationView direction="vertical" style={styles.grid}>
          {chunk(UI_LANGUAGES, 4).map((row, r) => (
          <SpatialNavigationView key={r} direction="horizontal" style={styles.row}>
          {row.map((l) => {
            const selected = l.code === current;
            const cardEl = (
              <Focusable key={l.code} onSelect={() => pick(l.code, l.story)} radius={radius.lg} scale={1.08}>
                {(focused) => (
                  <View style={[styles.card, selected && styles.cardSelected, focused && styles.cardFocused]}>
                    <T variant="h2" color={focused ? colors.night : colors.parchment} numberOfLines={1} style={{ letterSpacing: 0 }}>
                      {l.native}
                    </T>
                    <View style={styles.cardFoot}>
                      <T variant="caption" color={focused ? 'rgba(7,6,26,0.65)' : colors.dim} style={{ letterSpacing: 0 }}>
                        {l.english}
                      </T>
                      {selected ? <Icon name="check" size={px(26)} color={focused ? colors.night : colors.gold} strokeWidth={3} /> : null}
                    </View>
                  </View>
                )}
              </Focusable>
            );
            return selected ? <DefaultFocus key={l.code}>{cardEl}</DefaultFocus> : cardEl;
          })}
          </SpatialNavigationView>
          ))}
        </SpatialNavigationView>

        <View style={styles.foot}>
          <Icon name="globe" size={px(26)} color={colors.dim} />
          <T variant="body" color={colors.dim}>
            {t('lang.foot')}
          </T>
        </View>
      </View>
    </SpatialNavigationRoot>
  );
}

function chunk<T>(items: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, (i + 1) * size));
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center', paddingHorizontal: safe.x },
  head: { alignItems: 'center', marginBottom: px(64) },
  grid: { gap: px(26), alignItems: 'center' },
  row: { flexDirection: 'row', gap: px(26) },
  card: {
    width: px(360),
    height: px(150),
    paddingHorizontal: px(30),
    paddingVertical: px(24),
    justifyContent: 'space-between',
    borderRadius: radius.lg,
    backgroundColor: 'rgba(14,12,40,0.72)',
    borderWidth: px(1.5),
    borderColor: 'rgba(247,241,227,0.16)',
  },
  cardSelected: { borderColor: colors.gold, backgroundColor: 'rgba(245,198,107,0.14)' },
  cardFocused: { backgroundColor: colors.parchment, borderColor: colors.parchment },
  cardFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  foot: { flexDirection: 'row', alignItems: 'center', gap: px(12), marginTop: px(70) },
});
