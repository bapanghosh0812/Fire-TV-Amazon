import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Platform, StyleSheet, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SpatialNavigationRoot, SpatialNavigationView } from 'react-tv-space-navigation';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { Keypad } from '../components/Keypad';
import { ScreenHeader } from '../components/ScreenHeader';
import { T } from '../components/Typography';
import { StepDots, card } from '../components/Form';
import { useSky } from '../components/sky/skyState';
import { sfx } from '../audio/director';
import { useT } from '../i18n';
import { continueOnboarding } from '../navigation/onboarding';
import { accountApi, useAccount } from '../services/account';
import { useSettings } from '../state/settings';
import { colors, fonts, px, radius, safe } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Otp'>;
const native = Platform.OS !== 'web';

export function OtpScreen({ navigation, route }: Props) {
  useSky('center');
  const t = useT();
  const isFocused = useIsFocused();
  const language = useSettings((s) => s.language);
  const [requestId, setRequestId] = useState(route.params.requestId);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wait, setWait] = useState(route.params.resendIn);
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const id = setInterval(() => setWait((w) => Math.max(0, w - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  const verify = async (value: string) => {
    if (value.length !== 6 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const session = await accountApi.verifyOtp(requestId, value);
      sfx('ready');
      await useAccount.getState().setSession(session);
      continueOnboarding();
    } catch (e) {
      sfx('error');
      setError((e as Error).message);
      setCode('');
      Animated.sequence(
        [12, -12, 8, -8, 0].map((x) => Animated.timing(shake, { toValue: x, duration: 60, useNativeDriver: native })),
      ).start();
    } finally {
      setBusy(false);
    }
  };

  // The code checks itself as soon as the sixth digit is in.
  useEffect(() => {
    if (code.length === 6) verify(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const resend = async () => {
    try {
      const r = await accountApi.startOtp(route.params.full, language);
      setRequestId(r.requestId);
      setWait(r.resendIn);
      setError(null);
      sfx('magic');
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <SpatialNavigationRoot isActive={isFocused}>
      <View style={styles.screen}>
        <ScreenHeader onBack={() => navigation.goBack()} right={<StepDots steps={[t('onb.step.language'), t('onb.step.signin'), t('onb.step.family'), t('onb.step.promise')]} current={1} />} />
        <View style={styles.body}>
          <View style={styles.left}>
            <Icon name="key" size={px(64)} color={colors.gold} />
            <T variant="h1" style={{ marginTop: px(20) }}>
              {t('otp.title')}
            </T>
            <T variant="body" color={colors.muted} style={{ marginTop: px(12) }}>
              {t('otp.subtitle', { phone: route.params.phone })}
            </T>

            <Animated.View style={[styles.boxes, { transform: [{ translateX: shake }] }]}>
              {Array.from({ length: 6 }).map((_, i) => {
                const filled = i < code.length;
                const current = i === code.length;
                return (
                  <View key={i} style={[styles.box, filled && styles.boxFilled, current && styles.boxCurrent, !!error && styles.boxError]}>
                    <T style={styles.digit}>{code[i] ?? ''}</T>
                  </View>
                );
              })}
            </Animated.View>

            {error ? (
              <View style={styles.error}>
                <Icon name="info" size={px(26)} color={colors.coral} />
                <T variant="body" color={colors.coral}>
                  {error}
                </T>
              </View>
            ) : (
              <T variant="caption" color={colors.dim} style={{ letterSpacing: 0, marginTop: px(22) }}>
                {t('otp.expires')}
              </T>
            )}

            <SpatialNavigationView direction="horizontal" style={styles.actions}>
              <Button label={wait > 0 ? t('otp.resendIn', { s: wait }) : t('otp.resend')} icon="refresh" kind="ghost" disabled={wait > 0} onSelect={resend} />
              <Button label={t('otp.change')} icon="phone" kind="quiet" onSelect={() => navigation.goBack()} />
            </SpatialNavigationView>
          </View>

          <View style={styles.right}>
            {busy ? (
              <View style={styles.busy}>
                <ActivityIndicator color={colors.gold} size="large" />
                <T variant="body" color={colors.muted}>
                  {t('otp.checking')}
                </T>
              </View>
            ) : (
              <Keypad
                onDigit={(d) => {
                  setError(null);
                  setCode((v) => (v.length < 6 ? v + d : v));
                }}
                onDelete={() => setCode((v) => v.slice(0, -1))}
                onDone={() => verify(code)}
                doneEnabled={code.length === 6}
              />
            )}
          </View>
        </View>
      </View>
    </SpatialNavigationRoot>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent', paddingHorizontal: safe.x, justifyContent: 'center' },
  body: { flexDirection: 'row', alignItems: 'center', gap: px(80), marginTop: px(60) },
  left: { flex: 1 },
  right: { ...card, padding: px(40), minWidth: px(520), minHeight: px(500), alignItems: 'center', justifyContent: 'center' },
  boxes: { flexDirection: 'row', gap: px(18), marginTop: px(44) },
  box: {
    width: px(104),
    height: px(128),
    borderRadius: radius.md,
    backgroundColor: 'rgba(7,6,26,0.55)',
    borderWidth: px(2),
    borderColor: 'rgba(247,241,227,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxFilled: { borderColor: 'rgba(245,198,107,0.6)' },
  boxCurrent: { borderColor: colors.gold, borderWidth: px(3) },
  boxError: { borderColor: colors.coral },
  digit: { fontFamily: fonts.displayBold, fontSize: px(64), lineHeight: px(76), color: colors.parchment },
  error: { flexDirection: 'row', alignItems: 'center', gap: px(12), marginTop: px(22) },
  actions: { flexDirection: 'row', gap: px(20), marginTop: px(46) },
  busy: { alignItems: 'center', gap: px(18) },
});
