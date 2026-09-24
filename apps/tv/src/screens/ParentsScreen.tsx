import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { DefaultFocus, SpatialNavigationRoot, SpatialNavigationView } from 'react-tv-space-navigation';
import type { AgeBand } from '@storyloom/protocol';
import { Focusable } from '../components/Focusable';
import { Icon, IconName } from '../components/Icon';
import { Pill } from '../components/Pill';
import { T } from '../components/Typography';
import { useSettings } from '../state/settings';
import { colors, fonts, px, radius, safe } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Parents'>;

export function ParentsScreen(_: Props) {
  const isFocused = useIsFocused();
  const pinSet = useSettings((s) => s.pinSet);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    useSettings.getState().hydrate();
  }, []);

  return (
    <SpatialNavigationRoot isActive={isFocused}>
      <View style={styles.screen}>
        <LinearGradient colors={['#130F33', colors.night]} style={StyleSheet.absoluteFill} />
        {unlocked ? <SettingsPanel /> : <PinGate mode={pinSet ? 'enter' : 'create'} onUnlocked={() => setUnlocked(true)} />}
      </View>
    </SpatialNavigationRoot>
  );
}

// ---------------------------------------------------------------------------

function PinGate({ mode, onUnlocked }: { mode: 'enter' | 'create'; onUnlocked: () => void }) {
  const [pin, setPin] = useState('');
  const [first, setFirst] = useState<string | null>(null);
  const [error, setError] = useState('');

  const title = mode === 'enter' ? 'Parents only' : first ? 'Type it once more' : 'Create a parent PIN';
  const sub =
    mode === 'enter'
      ? 'Enter your 4-digit PIN to open settings'
      : first
        ? 'Just to be sure'
        : 'Keeps safety and privacy settings grown-ups only';

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
        setError('That PIN didn’t match. Try again.');
        setPin('');
      }
    } else if (!first) {
      setFirst(next);
      setPin('');
    } else if (first === next) {
      await s.setPin(next);
      onUnlocked();
    } else {
      setError('Those didn’t match. Let’s start again.');
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

const AGES: { id: AgeBand; label: string }[] = [
  { id: 'little', label: '3–5 years' },
  { id: 'kid', label: '6–8 years' },
  { id: 'big-kid', label: '9–11 years' },
];

function SettingsPanel() {
  const s = useSettings();
  return (
    <View style={styles.panel}>
      <T variant="overline" color={colors.gold}>
        PARENTS
      </T>
      <T variant="h1" style={{ marginBottom: px(30) }}>
        Safety, privacy & bedtime
      </T>
      <SpatialNavigationView direction="vertical" style={{ gap: px(22) }}>
        <Section icon="family" title="Age of our listeners" note="Stories, words and themes adapt to this age.">
          {AGES.map((a, i) => {
            const pill = <Pill key={a.id} label={a.label} selected={s.ageBand === a.id} onSelect={() => s.update({ ageBand: a.id })} />;
            return i === 0 ? <DefaultFocus key={a.id}>{pill}</DefaultFocus> : pill;
          })}
        </Section>
        <Section icon="shield" title="Gentle stories" note="No villains, scary moments or peril. Every story passes an AI safety check either way.">
          <Pill label="On" selected={s.gentleMode} onSelect={() => s.update({ gentleMode: true })} />
          <Pill label="Off" selected={!s.gentleMode} onSelect={() => s.update({ gentleMode: false })} />
        </Section>
        <Section icon="moon" title="Bedtime mode" note="Softer voice, warmer and dimmer screen, and the story winds down to sleep.">
          <Pill label="On" selected={s.bedtimeMode} onSelect={() => s.update({ bedtimeMode: true })} />
          <Pill label="Off" selected={!s.bedtimeMode} onSelect={() => s.update({ bedtimeMode: false })} />
          <View style={styles.sep} />
          {[0, 15, 30].map((m) => (
            <Pill key={m} label={m ? `Sleep in ${m} min` : 'No timer'} selected={s.sleepTimerMin === m} onSelect={() => s.update({ sleepTimerMin: m })} />
          ))}
        </Section>
        <Section icon="clock" title="Daily story time" note="A gentle goodbye screen appears when time is up.">
          {[0, 30, 45, 60].map((m) => (
            <Pill key={m} label={m ? `${m} min` : 'No limit'} selected={s.dailyLimitMin === m} onSelect={() => s.update({ dailyLimitMin: m })} />
          ))}
        </Section>
        <Section icon="sparkle" title="The sky" note="Follows the real time of day: sun by day, moon and stars at night. Or pick one.">
          <Pill label="Auto" selected={s.skyMode === 'auto'} onSelect={() => s.update({ skyMode: 'auto' })} />
          <Pill label="Day" selected={s.skyMode === 'day'} onSelect={() => s.update({ skyMode: 'day' })} />
          <Pill label="Night" selected={s.skyMode === 'night'} onSelect={() => s.update({ skyMode: 'night' })} />
        </Section>
        <Section icon="trash" title="Children’s drawings" note="By default, photos of drawings are deleted within 24 hours. Only the illustrated hero is kept.">
          <Pill label="Delete after 24h" selected={!s.keepDrawings} onSelect={() => s.update({ keepDrawings: false })} />
          <Pill label="Keep with the story" selected={s.keepDrawings} onSelect={() => s.update({ keepDrawings: true })} />
        </Section>
      </SpatialNavigationView>
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
  panel: { flex: 1, paddingHorizontal: safe.x, paddingTop: safe.y + px(10) },
  section: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: px(28),
    padding: px(26),
    borderRadius: radius.lg,
    backgroundColor: 'rgba(23,20,58,0.7)',
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
