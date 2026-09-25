import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon } from './Icon';
import { Keypad } from './Keypad';
import { T } from './Typography';
import { card } from './Form';
import { sfx } from '../audio/director';
import { useT } from '../i18n';
import { useSettings } from '../state/settings';
import { colors, px } from '../theme/tokens';

/** Grown-ups-only door: enter the 4-digit PIN, or create one (typed twice). */
export function PinGate({ mode, onUnlocked }: { mode: 'enter' | 'create'; onUnlocked: () => void }) {
  const t = useT();
  const [pin, setPin] = useState('');
  const [first, setFirst] = useState<string | null>(null);
  const [error, setError] = useState('');

  const title = mode === 'enter' ? t('parents.pinTitle') : first ? t('parents.againTitle') : t('parents.createTitle');
  const sub = mode === 'enter' ? t('parents.pinSub') : first ? t('parents.againSub') : t('parents.createSub');

  async function complete(next: string) {
    const s = useSettings.getState();
    if (mode === 'enter') {
      if (await s.checkPin(next)) {
        sfx('ready');
        onUnlocked();
      } else {
        sfx('error');
        setError(t('parents.wrong'));
        setPin('');
      }
    } else if (!first) {
      setFirst(next);
      setPin('');
    } else if (first === next) {
      await s.setPin(next);
      sfx('ready');
      onUnlocked();
    } else {
      sfx('error');
      setError(t('parents.mismatch'));
      setFirst(null);
      setPin('');
    }
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.left}>
        <View style={styles.badge}>
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
            <View key={i} style={[styles.dot, i < pin.length && styles.dotOn]} />
          ))}
        </View>
        <T variant="bodyStrong" color={colors.danger} style={{ marginTop: px(20), minHeight: px(40) }}>
          {error}
        </T>
      </View>
      <View style={styles.pad}>
        <Keypad
          onDigit={(d) => {
            setError('');
            const next = (pin + d).slice(0, 4);
            setPin(next);
            if (next.length === 4) complete(next);
          }}
          onDelete={() => setPin((p) => p.slice(0, -1))}
          onDone={() => pin.length === 4 && complete(pin)}
          doneEnabled={pin.length === 4}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: px(90) },
  left: { width: px(640) },
  badge: { width: px(112), height: px(112), borderRadius: px(56), backgroundColor: 'rgba(245,198,107,0.12)', alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', gap: px(22), marginTop: px(40) },
  dot: { width: px(30), height: px(30), borderRadius: px(15), borderWidth: px(3), borderColor: 'rgba(247,241,227,0.4)' },
  dotOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  pad: { ...card, padding: px(36) },
});
