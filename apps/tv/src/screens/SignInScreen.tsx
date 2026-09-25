import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { DefaultFocus, SpatialNavigationRoot, SpatialNavigationView } from 'react-tv-space-navigation';
import QRCode from 'react-native-qrcode-svg';
import type { ActivationStartResponse } from '@storyloom/protocol';
import { Button } from '../components/Button';
import { Icon, type IconName } from '../components/Icon';
import { ScreenHeader } from '../components/ScreenHeader';
import { T } from '../components/Typography';
import { StepDots, card } from '../components/Form';
import { useSky } from '../components/sky/skyState';
import { sfx } from '../audio/director';
import { useT } from '../i18n';
import { continueOnboarding } from '../navigation/onboarding';
import { accountApi, useAccount } from '../services/account';
import { colors, fonts, px, radius, safe } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'SignIn'>;

/**
 * Sign in the way big TV apps do: scan a code and finish on your phone (no typing with a remote),
 * or type your mobile number with the remote. Families can also look around first.
 */
export function SignInScreen({ navigation }: Props) {
  useSky('center');
  const t = useT();
  const isFocused = useIsFocused();
  const [act, setAct] = useState<ActivationStartResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(async () => {
    setError(null);
    try {
      setAct(await accountApi.startActivation());
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    if (isFocused) start();
  }, [isFocused, start]);

  // Wait for the phone to finish; refresh the code when it expires.
  useEffect(() => {
    if (!act || !isFocused) return;
    const expires = Date.now() + act.expiresIn * 1000;
    poll.current = setInterval(async () => {
      if (Date.now() > expires) {
        if (poll.current) clearInterval(poll.current);
        start();
        return;
      }
      try {
        const r = await accountApi.pollActivation(act.code, act.pollToken);
        if (r.status === 'approved') {
          if (poll.current) clearInterval(poll.current);
          sfx('ready');
          await useAccount.getState().setSession(r);
          continueOnboarding();
        } else if (r.status === 'expired') {
          if (poll.current) clearInterval(poll.current);
          start();
        }
      } catch {}
    }, 3000);
    return () => {
      if (poll.current) clearInterval(poll.current);
    };
  }, [act, isFocused, start]);

  return (
    <SpatialNavigationRoot isActive={isFocused}>
      <View style={styles.screen}>
        <ScreenHeader onBack={() => navigation.goBack()} right={<StepDots steps={[t('onb.step.language'), t('onb.step.signin'), t('onb.step.family'), t('onb.step.promise')]} current={1} />} />
        <T variant="h1" align="center">
          {t('signin.title')}
        </T>
        <T variant="body" color={colors.muted} align="center" style={{ marginTop: px(10) }}>
          {t('signin.subtitle')}
        </T>

        <View style={styles.cards}>
          <View style={[styles.card, styles.phoneCard]}>
            <View style={styles.badge}>
              <T variant="overline" color={colors.night}>
                {t('signin.recommended')}
              </T>
            </View>
            <T variant="h2">{t('signin.phone.title')}</T>
            <View style={styles.qrRow}>
              <View style={styles.qr}>
                {act ? <QRCode value={act.url} size={px(250)} backgroundColor="#F7F1E3" color="#07061A" /> : <ActivityIndicator color={colors.gold} size="large" />}
              </View>
              <View style={{ flex: 1, gap: px(18) }}>
                <Step n={1} icon="phone" text={t('signin.phone.step1')} />
                <Step n={2} icon="key" text={t('signin.phone.step2')} />
                <Step n={3} icon="check" text={t('signin.phone.step3')} />
              </View>
            </View>
            <View style={styles.codeRow}>
              <T variant="caption" color={colors.dim} style={{ letterSpacing: 0 }}>
                {t('signin.phone.orVisit', { url: act?.url.replace(/^https?:\/\//, '').split('?')[0] ?? '…' })}
              </T>
              <T style={styles.code}>{act?.code ?? '····-····'}</T>
            </View>
            {error ? (
              <T variant="caption" color={colors.coral} style={{ letterSpacing: 0 }}>
                {error}
              </T>
            ) : null}
          </View>

          <View style={styles.or}>
            <View style={styles.orLine} />
            <T variant="overline" color={colors.dim}>
              {t('common.or')}
            </T>
            <View style={styles.orLine} />
          </View>

          <View style={[styles.card, styles.remoteCard]}>
            <Icon name="remote" size={px(64)} color={colors.gold} />
            <T variant="h2" style={{ marginTop: px(18) }}>
              {t('signin.remote.title')}
            </T>
            <T variant="body" color={colors.muted} style={{ marginTop: px(10) }}>
              {t('signin.remote.body')}
            </T>
            <SpatialNavigationView direction="vertical" style={{ marginTop: px(34), gap: px(18) }}>
              <DefaultFocus>
                <Button label={t('signin.remote.cta')} icon="phone" size="lg" onSelect={() => navigation.navigate('Phone')} />
              </DefaultFocus>
              <Button
                label={t('signin.explore')}
                icon="eye"
                kind="ghost"
                onSelect={() => {
                  useAccount.getState().exploreDemo();
                  continueOnboarding();
                }}
              />
            </SpatialNavigationView>
          </View>
        </View>

        <View style={styles.foot}>
          <Icon name="shield" size={px(24)} color={colors.dim} />
          <T variant="caption" color={colors.dim} style={{ letterSpacing: 0 }}>
            {t('signin.privacy')}
          </T>
        </View>
      </View>
    </SpatialNavigationRoot>
  );
}

function Step({ n, icon, text }: { n: number; icon: IconName; text: string }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepNum}>
        <T variant="overline" color={colors.night}>
          {n}
        </T>
      </View>
      <Icon name={icon} size={px(28)} color={colors.gold} />
      <T variant="body" style={{ flex: 1 }}>
        {text}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent', justifyContent: 'center', paddingHorizontal: safe.x, paddingTop: px(90) },
  cards: { flexDirection: 'row', alignItems: 'stretch', justifyContent: 'center', marginTop: px(46), gap: px(30) },
  card: { ...card, padding: px(44) },
  phoneCard: { width: px(900), gap: px(22) },
  remoteCard: { width: px(620), justifyContent: 'center' },
  badge: { alignSelf: 'flex-start', backgroundColor: colors.gold, borderRadius: radius.pill, paddingHorizontal: px(16), paddingVertical: px(4) },
  qrRow: { flexDirection: 'row', gap: px(36), alignItems: 'center' },
  qr: { width: px(290), height: px(290), borderRadius: radius.md, backgroundColor: colors.parchment, alignItems: 'center', justifyContent: 'center' },
  step: { flexDirection: 'row', alignItems: 'center', gap: px(14) },
  stepNum: { width: px(34), height: px(34), borderRadius: px(17), backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  codeRow: { gap: px(4), marginTop: px(6) },
  code: { fontFamily: fonts.displayBold, fontSize: px(54), lineHeight: px(64), color: colors.goldBright, letterSpacing: px(4) },
  or: { alignItems: 'center', justifyContent: 'center', gap: px(14) },
  orLine: { width: px(2), height: px(120), backgroundColor: colors.line },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: px(12), marginTop: px(40) },
});
