import React, { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SpatialNavigationRoot, SpatialNavigationView } from 'react-tv-space-navigation';
import { Button } from '../components/Button';
import { Focusable } from '../components/Focusable';
import { Icon } from '../components/Icon';
import { Keypad } from '../components/Keypad';
import { ScreenHeader } from '../components/ScreenHeader';
import { SideSheet } from '../components/SideSheet';
import { T } from '../components/Typography';
import { StepDots, card } from '../components/Form';
import { useSky } from '../components/sky/skyState';
import { sfx } from '../audio/director';
import { COUNTRIES, homeCountry, type Country } from '../data/countries';
import { useT } from '../i18n';
import { accountApi } from '../services/account';
import { useSettings } from '../state/settings';
import { colors, fonts, px, radius, safe } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Phone'>;

/** Groups digits the way people read phone numbers: 98765 43210, 202 555 0100. */
function pretty(digits: string) {
  if (digits.length <= 5) return digits;
  if (digits.length === 10) return `${digits.slice(0, 5)} ${digits.slice(5)}`;
  return digits.replace(/(\d{3})(?=\d)/g, '$1 ');
}

export function PhoneScreen({ navigation }: Props) {
  useSky('center');
  const t = useT();
  const isFocused = useIsFocused();
  const language = useSettings((s) => s.language);
  const [country, setCountry] = useState<Country>(() => homeCountry());
  const [digits, setDigits] = useState('');
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = digits.length >= 6 && digits.length <= 14;

  const send = async () => {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    const full = `+${country.dial}${digits.replace(/^0+/, '')}`;
    try {
      const r = await accountApi.startOtp(full, language);
      sfx('magic');
      navigation.navigate('Otp', { requestId: r.requestId, phone: r.phone, full, resendIn: r.resendIn });
    } catch (e) {
      sfx('error');
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const countries = useMemo(() => [country, ...COUNTRIES.filter((c) => c.iso !== country.iso)], [country]);

  return (
    <SpatialNavigationRoot isActive={isFocused && !picking}>
      <View style={styles.screen}>
        <ScreenHeader onBack={() => navigation.goBack()} right={<StepDots steps={[t('onb.step.language'), t('onb.step.signin'), t('onb.step.family'), t('onb.step.promise')]} current={1} />} />
        <View style={styles.body}>
          <View style={styles.left}>
            <T variant="overline" color={colors.gold}>
              {t('phone.overline')}
            </T>
            <T variant="h1" style={{ marginTop: px(12) }}>
              {t('phone.title')}
            </T>
            <T variant="body" color={colors.muted} style={{ marginTop: px(14), maxWidth: px(760) }}>
              {t('phone.subtitle')}
            </T>

            <SpatialNavigationView direction="horizontal" style={styles.numberRow}>
              <Focusable onSelect={() => setPicking(true)} radius={radius.md} scale={1.04}>
                {(focused) => (
                  <View style={[styles.country, focused && styles.focused]}>
                    <T style={{ fontSize: px(40), lineHeight: px(50) }}>{country.flag}</T>
                    <T style={[styles.number, { color: focused ? colors.night : colors.parchment }]}>+{country.dial}</T>
                    <Icon name="right" size={px(24)} color={focused ? colors.night : colors.dim} />
                  </View>
                )}
              </Focusable>
              <View style={[styles.digits, !!error && { borderColor: colors.coral }]}>
                <T style={[styles.number, { color: digits ? colors.parchment : colors.dim }]} numberOfLines={1}>
                  {digits ? pretty(digits) : t('phone.placeholder')}
                </T>
                <View style={styles.caret} />
              </View>
            </SpatialNavigationView>

            {error ? (
              <View style={styles.error}>
                <Icon name="info" size={px(26)} color={colors.coral} />
                <T variant="body" color={colors.coral} style={{ flex: 1 }}>
                  {error}
                </T>
              </View>
            ) : (
              <T variant="caption" color={colors.dim} style={{ letterSpacing: 0, marginTop: px(22) }}>
                {t('phone.legal')}
              </T>
            )}

            <View style={styles.points}>
              <Point icon="lock" text={t('phone.point1')} />
              <Point icon="shield" text={t('phone.point2')} />
              <Point icon="heart" text={t('phone.point3')} />
            </View>
          </View>

          <View style={styles.right}>
            <Keypad
              enabled={!picking}
              onDigit={(d) => {
                setError(null);
                setDigits((v) => (v.length < 14 ? v + d : v));
              }}
              onDelete={() => setDigits((v) => v.slice(0, -1))}
              onDone={send}
              doneEnabled={valid && !busy}
            />
            <View style={{ marginTop: px(26) }}>
              {busy ? (
                <ActivityIndicator color={colors.gold} size="large" />
              ) : (
                <Button label={t('phone.send')} icon="right" size="lg" disabled={!valid} onSelect={send} />
              )}
            </View>
          </View>
        </View>
      </View>

      {picking ? (
        <SideSheet
          title={t('phone.country')}
          onClose={() => setPicking(false)}
          columns={[
            {
              title: t('phone.country'),
              icon: 'globe',
              value: country.iso,
              options: countries.map((c) => ({ value: c.iso, label: `${c.flag}  ${c.name}`, hint: `+${c.dial}` })),
              onPick: (iso: string) => {
                setCountry(COUNTRIES.find((c) => c.iso === iso) ?? country);
                setPicking(false);
              },
            },
          ]}
        />
      ) : null}
    </SpatialNavigationRoot>
  );
}

function Point({ icon, text }: { icon: 'lock' | 'shield' | 'heart'; text: string }) {
  return (
    <View style={styles.point}>
      <Icon name={icon} size={px(28)} color={colors.gold} />
      <T variant="body" color={colors.muted} style={{ flex: 1 }}>
        {text}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent', paddingHorizontal: safe.x, justifyContent: 'center' },
  body: { flexDirection: 'row', alignItems: 'center', gap: px(80), marginTop: px(60) },
  left: { flex: 1 },
  right: { ...card, padding: px(40), alignItems: 'center' },
  numberRow: { flexDirection: 'row', gap: px(18), marginTop: px(44) },
  country: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: px(14),
    height: px(104),
    paddingHorizontal: px(26),
    borderRadius: radius.md,
    backgroundColor: 'rgba(247,241,227,0.08)',
    borderWidth: px(1.5),
    borderColor: colors.line,
  },
  focused: { backgroundColor: colors.parchment, borderColor: colors.parchment },
  digits: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: px(104),
    paddingHorizontal: px(30),
    borderRadius: radius.md,
    backgroundColor: 'rgba(7,6,26,0.55)',
    borderWidth: px(2),
    borderColor: 'rgba(245,198,107,0.55)',
  },
  number: { fontFamily: fonts.displayBold, fontSize: px(50), lineHeight: px(62), letterSpacing: px(2) },
  caret: { width: px(3), height: px(52), backgroundColor: colors.gold, marginLeft: px(6) },
  error: { flexDirection: 'row', alignItems: 'center', gap: px(12), marginTop: px(22) },
  points: { marginTop: px(46), gap: px(16) },
  point: { flexDirection: 'row', alignItems: 'center', gap: px(16) },
});
