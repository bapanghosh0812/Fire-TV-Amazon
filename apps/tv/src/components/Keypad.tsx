import React from 'react';
import { StyleSheet, View } from 'react-native';
import { DefaultFocus, SpatialNavigationView } from 'react-tv-space-navigation';
import { Focusable } from './Focusable';
import { Icon } from './Icon';
import { T } from './Typography';
import { sfx } from '../audio/director';
import { useRemoteKeys } from '../remote/hooks';
import { RemoteKey, digitOf } from '../remote/keys';
import { colors, fonts, px, radius } from '../theme/tokens';

interface Props {
  onDigit: (d: string) => void;
  onDelete: () => void;
  onDone?: () => void;
  doneEnabled?: boolean;
  enabled?: boolean;
}

const ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['del', '0', 'done'],
];

/** A big, calm number pad for the remote (number keys on a keyboard or remote work too). */
export function Keypad({ onDigit, onDelete, onDone, doneEnabled = true, enabled = true }: Props) {
  useRemoteKeys((key) => {
    const d = digitOf(key);
    if (d !== null) onDigit(d);
    else if (key === RemoteKey.Delete) onDelete();
  }, enabled);

  return (
    <SpatialNavigationView direction="vertical" style={styles.grid}>
      {ROWS.map((row, r) => (
        <SpatialNavigationView key={r} direction="horizontal" style={styles.row}>
          {row.map((k) => {
            const key = (
              <Focusable
                key={k}
                onSelect={() => {
                  if (k === 'del') {
                    sfx('toggle');
                    onDelete();
                  } else if (k === 'done') {
                    if (doneEnabled && onDone) {
                      sfx('select');
                      onDone();
                    } else sfx('error');
                  } else {
                    sfx('toggle');
                    onDigit(k);
                  }
                }}
                radius={radius.md}
                scale={1.08}
              >
                {(focused) => (
                  <View
                    style={[
                      styles.key,
                      k === 'done' && (doneEnabled ? styles.done : styles.doneOff),
                      focused && styles.focused,
                    ]}
                  >
                    {k === 'del' ? (
                      <Icon name="back" size={px(38)} color={focused ? colors.night : colors.parchment} />
                    ) : k === 'done' ? (
                      <Icon name="check" size={px(40)} color={focused || doneEnabled ? colors.night : colors.dim} strokeWidth={3} />
                    ) : (
                      <T style={[styles.digit, { color: focused ? colors.night : colors.parchment }]}>{k}</T>
                    )}
                  </View>
                )}
              </Focusable>
            );
            return k === '1' ? <DefaultFocus key={k}>{key}</DefaultFocus> : key;
          })}
        </SpatialNavigationView>
      ))}
    </SpatialNavigationView>
  );
}

const styles = StyleSheet.create({
  grid: { gap: px(16) },
  row: { flexDirection: 'row', gap: px(16) },
  key: {
    width: px(132),
    height: px(96),
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(247,241,227,0.08)',
    borderWidth: px(1.5),
    borderColor: colors.line,
  },
  done: { backgroundColor: colors.gold, borderColor: colors.goldBright },
  doneOff: { backgroundColor: 'rgba(247,241,227,0.05)' },
  focused: { backgroundColor: colors.parchment, borderColor: colors.parchment },
  digit: { fontFamily: fonts.display, fontSize: px(46), lineHeight: px(56) },
});
