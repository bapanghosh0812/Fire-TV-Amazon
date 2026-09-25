import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { DefaultFocus, SpatialNavigationRoot, SpatialNavigationScrollView, SpatialNavigationView } from 'react-tv-space-navigation';
import QRCode from 'react-native-qrcode-svg';
import { LEGAL_DOCUMENTS, LEGAL_UPDATED, LEGAL_VERSION, type LegalDocument } from '@storyloom/protocol';
import { Button } from '../components/Button';
import { Focusable } from '../components/Focusable';
import { Icon } from '../components/Icon';
import { Pill } from '../components/Pill';
import { ScreenHeader } from '../components/ScreenHeader';
import { T } from '../components/Typography';
import { CheckRow, StepDots, card } from '../components/Form';
import { useSky } from '../components/sky/skyState';
import { sfx } from '../audio/director';
import { useT } from '../i18n';
import { continueOnboarding } from '../navigation/onboarding';
import { accountApi, useAccount } from '../services/account';
import { config } from '../services/config';
import { TERMS_VERSION, useSettings } from '../state/settings';
import { colors, fonts, px, radius, safe } from '../theme/tokens';
import type { LegalDoc, RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Terms'>;
const DOCS: LegalDoc[] = ['terms', 'privacy', 'children'];

export function TermsScreen({ navigation, route }: Props) {
  useSky('center');
  const t = useT();
  const isFocused = useIsFocused();
  const reading = route.params?.mode === 'read';
  const [doc, setDoc] = useState<LegalDoc>(route.params?.doc ?? 'terms');
  const [firstDoc] = useState(doc);
  const [agree, setAgree] = useState(false);
  const [guardian, setGuardian] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const d = LEGAL_DOCUMENTS[doc];

  const accept = async () => {
    if (!agree || !guardian) {
      sfx('error');
      setError(t('terms.needBoth'));
      return;
    }
    setBusy(true);
    try {
      if (useAccount.getState().user) {
        const { user } = await accountApi.acceptTerms(LEGAL_VERSION);
        useAccount.getState().setUser(user);
      }
      useSettings.getState().update({ termsVersion: TERMS_VERSION, termsAcceptedAt: new Date().toISOString() });
      sfx('ready');
      continueOnboarding();
    } catch (e) {
      sfx('error');
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SpatialNavigationRoot isActive={isFocused}>
      <View style={styles.screen}>
        <ScreenHeader
          onBack={() => navigation.goBack()}
          title={reading ? t('terms.readTitle') : undefined}
          right={reading ? null : <StepDots steps={[t('onb.step.language'), t('onb.step.signin'), t('onb.step.family'), t('onb.step.promise')]} current={3} />}
        />
        <View style={styles.body}>
          <View style={styles.reader}>
            <SpatialNavigationView direction="horizontal" style={styles.tabs}>
              {DOCS.map((id) => {
                const pill = <Pill key={id} label={LEGAL_DOCUMENTS[id].title} icon={id === 'terms' ? 'book' : id === 'privacy' ? 'lock' : 'heart'} selected={doc === id} onSelect={() => setDoc(id)} />;
                return id === firstDoc ? <DefaultFocus key={id}>{pill}</DefaultFocus> : pill;
              })}
            </SpatialNavigationView>
            <Document doc={d} />
          </View>

          {!reading ? (
            <View style={styles.side}>
              <T variant="overline" color={colors.gold}>
                {t('terms.overline')}
              </T>
              <T variant="h2" style={{ marginTop: px(8) }}>
                {t('terms.title')}
              </T>
              <T variant="body" color={colors.muted} style={{ marginTop: px(10) }}>
                {t('terms.subtitle')}
              </T>
              <SpatialNavigationView direction="vertical" style={{ gap: px(14), marginTop: px(26) }}>
                <CheckRow checked={agree} label={t('terms.agree')} onToggle={() => setAgree((v) => !v)} />
                <CheckRow checked={guardian} label={t('terms.guardian')} hint={t('terms.guardianHint')} onToggle={() => setGuardian((v) => !v)} />
                {error ? (
                  <T variant="caption" color={colors.coral} style={{ letterSpacing: 0 }}>
                    {error}
                  </T>
                ) : null}
                <View style={{ marginTop: px(10) }}>
                  {busy ? <ActivityIndicator color={colors.gold} size="large" /> : <Button label={t('terms.accept')} icon="check" size="lg" disabled={!agree || !guardian} onSelect={accept} />}
                </View>
              </SpatialNavigationView>
              <View style={styles.qrRow}>
                <View style={styles.qr}>
                  <QRCode value={`${config.companionBaseUrl}/legal/${doc}`} size={px(118)} backgroundColor="#F7F1E3" color="#07061A" />
                </View>
                <T variant="caption" color={colors.dim} style={{ flex: 1, letterSpacing: 0 }}>
                  {t('terms.onPhone')}
                </T>
              </View>
            </View>
          ) : null}
        </View>
      </View>
    </SpatialNavigationRoot>
  );
}

/** The document as focusable paragraphs, so the remote scrolls through it naturally. */
function Document({ doc }: { doc: LegalDocument }) {
  const t = useT();
  return (
    <SpatialNavigationScrollView key={doc.id} offsetFromStart={px(160)} style={styles.scroll}>
      <SpatialNavigationView direction="vertical" style={{ gap: px(6), paddingBottom: px(120) }}>
        <Block>
          <View style={styles.summary}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: px(12) }}>
              <Icon name="sparkle" size={px(26)} color={colors.gold} />
              <T variant="overline" color={colors.gold}>
                {t('terms.short')}
              </T>
            </View>
            {doc.summary.map((line) => (
              <View key={line} style={styles.bulletRow}>
                <Icon name="check" size={px(24)} color={colors.gold} strokeWidth={3} />
                <T variant="body" style={{ flex: 1 }}>
                  {line}
                </T>
              </View>
            ))}
          </View>
        </Block>
        <Block>
          <T variant="h2" style={{ marginTop: px(20) }}>
            {doc.title}
          </T>
          <T variant="caption" color={colors.dim} style={{ letterSpacing: 0 }}>
            {t('terms.updated', { date: LEGAL_UPDATED })}
          </T>
        </Block>
        {doc.sections.map((s) => (
          <React.Fragment key={s.heading}>
            <Block>
              <T variant="h3" color={colors.goldBright} style={{ marginTop: px(20) }}>
                {s.heading}
              </T>
            </Block>
            {s.body.map((p, i) => (
              <Block key={i}>
                {p.startsWith('• ') ? (
                  <View style={styles.bulletRow}>
                    <View style={styles.dot} />
                    <T style={styles.para}>{p.slice(2)}</T>
                  </View>
                ) : (
                  <T style={styles.para}>{p}</T>
                )}
              </Block>
            ))}
          </React.Fragment>
        ))}
      </SpatialNavigationView>
    </SpatialNavigationScrollView>
  );
}

function Block({ children }: { children: React.ReactNode }) {
  return (
    <Focusable radius={radius.sm} scale={1} ringColor="transparent">
      {(focused) => <View style={[styles.block, focused && styles.blockFocused]}>{children}</View>}
    </Focusable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent', paddingHorizontal: safe.x, paddingTop: px(150) },
  body: { flex: 1, flexDirection: 'row', gap: px(40), paddingBottom: safe.y },
  reader: { flex: 1, ...card, padding: px(34), paddingBottom: 0, overflow: 'hidden' },
  tabs: { flexDirection: 'row', gap: px(14), marginBottom: px(20) },
  scroll: { flex: 1 },
  summary: { backgroundColor: 'rgba(245,198,107,0.08)', borderRadius: radius.md, padding: px(26), gap: px(12), borderWidth: px(1.5), borderColor: 'rgba(245,198,107,0.25)' },
  bulletRow: { flexDirection: 'row', gap: px(14), alignItems: 'flex-start' },
  dot: { width: px(10), height: px(10), borderRadius: px(5), backgroundColor: colors.gold, marginTop: px(16) },
  para: { flex: 1, fontFamily: fonts.body, fontSize: px(27), lineHeight: px(42), color: colors.parchment },
  block: { paddingVertical: px(6), paddingHorizontal: px(14), borderLeftWidth: px(4), borderColor: 'transparent', borderRadius: radius.sm },
  blockFocused: { borderColor: colors.gold, backgroundColor: 'rgba(247,241,227,0.05)' },
  side: { width: px(620), ...card, padding: px(40) },
  qrRow: { flexDirection: 'row', alignItems: 'center', gap: px(20), marginTop: px(30) },
  qr: { padding: px(10), backgroundColor: colors.parchment, borderRadius: radius.sm },
});
