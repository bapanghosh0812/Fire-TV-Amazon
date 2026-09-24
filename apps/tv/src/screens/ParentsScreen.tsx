import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  DefaultFocus,
  SpatialNavigationRoot,
  SpatialNavigationScrollView,
  SpatialNavigationView,
} from 'react-tv-space-navigation';
import { languageInfo, type AgeBand } from '@storyloom/protocol';
import { SkyBackdrop } from '../components/sky/SkyBackdrop';
import { Focusable } from '../components/Focusable';
import { Icon, IconName } from '../components/Icon';
import { LanguageSheet } from '../components/LanguageSheet';
import { Pill } from '../components/Pill';
import { T } from '../components/Typography';
import { useSettings } from '../state/settings';
import { useT, type StringKey } from '../i18n';
import { colors, fonts, px, radius, safe } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Parents'>;

export function ParentsScreen(_: Props) {
  const isFocused = useIsFocused();
  const pinSet = useSettings((s) => s.pinSet);
  const [unlocked, setUnlocked] = useState(false);
  const [choosingLanguage, setChoosingLanguage] = useState(false);

  useEffect(() => {
    useSettings.getState().hydrate();
  }, []);

  return (
    <SpatialNavigationRoot isActive={isFocused && !choosingLanguage}>
      <View style={styles.screen}>
        <SkyBackdrop scrim="center" />
        {unlocked ? (
          <SettingsPanel onChooseLanguage={() => setChoosingLanguage(true)} />
        ) : (
          <PinGate mode={pinSet ? 'enter' : 'create'} onUnlocked={() => setUnlocked(true)} />
        )}
        {choosingLanguage ? (
          <LanguageSheet
            selected={useSettings.getState().language}
            onClose={() => setChoosingLanguage(false)}
            onPick={(code) => {
              useSettings.getState().update({ language: code });
              setChoosingLanguage(false);
            }}
          />
        ) : null}
      </View>
    </SpatialNavigationRoot>
  );
}

// ---------------------------------------------------------------------------

function PinGate({ mode, onUnlocked }: { mode: 'enter' | 'create'; onUnlocked: () => void }) {
  const t = useT();
  const [pin, setPin] = useState('');
  const [first, setFirst] = useState<string | null>(null);
  const [error, setError] = useState('');

  const title = mode === 'enter' ? t('parents.pinTitle') : first ? t('parents.againTitle') : t('parents.createTitle');
  const sub = mode === 'enter' ? t('parents.pinSub') : first ? t('parents.againSub') : t('parents.createSub');

  async function press(key: string) {
    setError('');
    if (key === 'del') return setPin((p) => p.slice(0, -1));
    const next = (pin + key).slice(0, 4);
    setPin(next);
    if (next.length < 4) return;
    const s = useSettings.getState();
    if (mode === 'enter') {
      if (await s.checkPin(next)) onUnlocked();
      else {
        setError(t('parents.wrong'));
        setPin('');
      }
    } else if (!first) {
      setFirst(next);
      setPin('');
    } else if (first === next) {
      await s.setPin(next);
      onUnlocked();
    } else {
      setError(t('parents.mismatch'));
      setFirst(null);
      setPin('');
    }
  }

  const rows = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', 'del'],
  ];

  return (
    <View style={styles.pinWrap}>
      <View style={styles.pinLeft}>
        <View style={styles.lockBadge}>
          <Icon name="shield" size={px(56)} color={colors.gold} />
        </View>
        <T variant="h1" style={{ marginTop: px(30) }}>
          {title}
        </T>
        <T variant="body" color={colors.muted} style={{ marginTop: px(10) }}>
          {sub}
        </T>
        <View style={styles.dots}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={[styles.pinDot, i < pin.length && styles.pinDotOn]} />
          ))}
        </View>
        <T variant="bodyStrong" color={colors.danger} style={{ marginTop: px(20), minHeight: px(40) }}>
          {error}
        </T>
      </View>
      <SpatialNavigationView direction="vertical" style={{ gap: px(20) }}>
        {rows.map((row, r) => (
          <SpatialNavigationView key={r} direction="horizontal" style={{ flexDirection: 'row', gap: px(20) }}>
            {row.map((k) => {
              if (!k) return <View key="blank" style={styles.key} />;
              const node = (
                <Focusable key={k} onSelect={() => press(k)} radius={px(56)} scale={1.1}>
                  {(focused) => (
                    <View style={[styles.key, focused && { backgroundColor: colors.parchment }]}>
                      {k === 'del' ? (
                        <Icon name="left" size={px(40)} color={focused ? colors.night : colors.parchment} />
                      ) : (
                        <T style={[styles.keyText, focused && { color: colors.night }]}>{k}</T>
                      )}
                    </View>
                  )}
                </Focusable>
              );
              return k === '5' ? <DefaultFocus key={k}>{node}</DefaultFocus> : node;
            })}
          </SpatialNavigationView>
        ))}
      </SpatialNavigationView>
    </View>
  );
}

// ---------------------------------------------------------------------------

const AGES: { id: AgeBand; label: StringKey }[] = [
  { id: 'little', label: 'parents.age.little' },
  { id: 'kid', label: 'parents.age.kid' },
  { id: 'big-kid', label: 'parents.age.big' },
];

function SettingsPanel({ onChooseLanguage }: { onChooseLanguage: () => void }) {
  const t = useT();
  const s = useSettings();
  return (
    <View style={styles.panel}>
      <View style={styles.panelHead}>
        <T variant="overline" color={colors.gold}>
          {t('parents.overline')}
        </T>
        <T variant="h1">{t('parents.title')}</T>
      </View>
      <SpatialNavigationScrollView offsetFromStart={px(200)} style={{ flex: 1 }}>
        <SpatialNavigationView direction="vertical" style={styles.sections}>
          <Section icon="family" title={t('parents.age')} note={t('parents.ageNote')}>
            {AGES.map((a, i) => {
              const pill = <Pill key={a.id} label={t(a.label)} selected={s.ageBand === a.id} onSelect={() => s.update({ ageBand: a.id })} />;
              return i === 0 ? <DefaultFocus key={a.id}>{pill}</DefaultFocus> : pill;
            })}
          </Section>
          <Section icon="globe" title={t('parents.language')} note={t('parents.languageNote')}>
            <Pill label={languageInfo(s.language).native} icon="globe" selected onSelect={onChooseLanguage} />
          </Section>
          <Section icon="shield" title={t('parents.gentle')} note={t('parents.gentleNote')}>
            <Pill label={t('common.on')} selected={s.gentleMode} onSelect={() => s.update({ gentleMode: true })} />
            <Pill label={t('common.off')} selected={!s.gentleMode} onSelect={() => s.update({ gentleMode: false })} />
          </Section>
          <Section icon="moon" title={t('parents.bedtime')} note={t('parents.bedtimeNote')}>
            <Pill label={t('common.on')} selected={s.bedtimeMode} onSelect={() => s.update({ bedtimeMode: true })} />
            <Pill label={t('common.off')} selected={!s.bedtimeMode} onSelect={() => s.update({ bedtimeMode: false })} />
            <View style={styles.sep} />
            {[0, 15, 30].map((m) => (
              <Pill
                key={m}
                label={m ? t('parents.sleepIn', { n: m }) : t('parents.noTimer')}
                selected={s.sleepTimerMin === m}
                onSelect={() => s.update({ sleepTimerMin: m })}
              />
            ))}
          </Section>
          <Section icon="clock" title={t('parents.daily')} note={t('parents.dailyNote')}>
            {[0, 30, 45, 60].map((m) => (
              <Pill
                key={m}
                label={m ? t('parents.minutes', { n: m }) : t('parents.noLimit')}
                selected={s.dailyLimitMin === m}
                onSelect={() => s.update({ dailyLimitMin: m })}
              />
            ))}
          </Section>
          <Section icon="sparkle" title={t('parents.sky')} note={t('parents.skyNote')}>
            <Pill label={t('parents.skyAuto')} selected={s.skyMode === 'auto'} onSelect={() => s.update({ skyMode: 'auto' })} />
            <Pill label={t('parents.skyDay')} selected={s.skyMode === 'day'} onSelect={() => s.update({ skyMode: 'day' })} />
            <Pill label={t('parents.skyNight')} selected={s.skyMode === 'night'} onSelect={() => s.update({ skyMode: 'night' })} />
          </Section>
          <Section icon="trash" title={t('parents.drawings')} note={t('parents.drawingsNote')}>
            <Pill label={t('parents.delete24')} selected={!s.keepDrawings} onSelect={() => s.update({ keepDrawings: false })} />
            <Pill label={t('parents.keep')} selected={s.keepDrawings} onSelect={() => s.update({ keepDrawings: true })} />
          </Section>
          <View style={{ height: px(160) }} />
        </SpatialNavigationView>
      </SpatialNavigationScrollView>
    </View>
  );
}

function Section({ icon, title, note, children }: { icon: IconName; title: string; note: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionIcon}>
        <Icon name={icon} size={px(34)} color={colors.gold} />
      </View>
      <View style={{ width: px(560) }}>
        <T variant="h3">{title}</T>
        <T variant="caption" color={colors.muted} style={{ letterSpacing: 0, marginTop: px(4) }}>
          {note}
        </T>
      </View>
      <SpatialNavigationView direction="horizontal" style={styles.sectionControls}>
        {children}
      </SpatialNavigationView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.night },
  pinWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: px(160) },
  pinLeft: { width: px(620) },
  lockBadge: {
    width: px(110),
    height: px(110),
    borderRadius: px(55),
    backgroundColor: 'rgba(245,198,107,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: { flexDirection: 'row', gap: px(22), marginTop: px(40) },
  pinDot: { width: px(30), height: px(30), borderRadius: px(15), borderWidth: px(3), borderColor: colors.muted },
  pinDotOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  key: {
    width: px(112),
    height: px(112),
    borderRadius: px(56),
    backgroundColor: 'rgba(247,241,227,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: { fontFamily: fonts.display, fontSize: px(48), lineHeight: px(58), color: colors.parchment },
  panel: { flex: 1 },
  panelHead: { paddingHorizontal: safe.x, paddingTop: safe.y + px(10), paddingBottom: px(24), gap: px(6) },
  sections: { gap: px(22), paddingHorizontal: safe.x, paddingTop: px(8) },
  section: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: px(28),
    padding: px(26),
    borderRadius: radius.lg,
    backgroundColor: 'rgba(23,20,58,0.78)',
  },
  sectionIcon: {
    width: px(70),
    height: px(70),
    borderRadius: px(35),
    backgroundColor: 'rgba(245,198,107,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionControls: { flexDirection: 'row', alignItems: 'center', gap: px(14), flex: 1, flexWrap: 'wrap' },
  sep: { width: px(2), height: px(40), backgroundColor: colors.line, marginHorizontal: px(6) },
});
