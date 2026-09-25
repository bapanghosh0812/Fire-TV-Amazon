import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Focusable } from './Focusable';
import { Icon } from './Icon';
import { LogoMark } from './Logo';
import { T } from './Typography';
import { sfx } from '../audio/director';
import { useT } from '../i18n';
import { colors, px, radius, safe } from '../theme/tokens';

interface Props {
  title?: string;
  overline?: string;
  onBack?: () => void;
  right?: React.ReactNode;
}

/**
 * The same top bar on every screen: a Back button you can always reach with the remote,
 * the screen's name, and room on the right for status. (The remote's Back key works too.)
 */
export function ScreenHeader({ title, overline, onBack, right }: Props) {
  const t = useT();
  return (
    <View style={styles.bar}>
      {onBack ? (
        <Focusable
          onSelect={() => {
            sfx('back');
            onBack();
          }}
          radius={radius.pill}
          scale={1.06}
        >
          {(focused) => (
            <View style={[styles.back, focused && styles.backFocused]}>
              <Icon name="back" size={px(30)} color={focused ? colors.night : colors.parchment} strokeWidth={2.4} />
              <T variant="bodyStrong" color={focused ? colors.night : colors.parchment} style={{ fontSize: px(24) }}>
                {t('common.back')}
              </T>
            </View>
          )}
        </Focusable>
      ) : (
        <LogoMark size={px(56)} />
      )}
      <View style={styles.titles}>
        {overline ? (
          <T variant="overline" color={colors.gold}>
            {overline}
          </T>
        ) : null}
        {title ? (
          <T variant="h3" numberOfLines={1}>
            {title}
          </T>
        ) : null}
      </View>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    top: safe.y,
    left: safe.x,
    right: safe.x,
    flexDirection: 'row',
    alignItems: 'center',
    gap: px(28),
    zIndex: 20,
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: px(10),
    height: px(64),
    paddingLeft: px(18),
    paddingRight: px(26),
    borderRadius: radius.pill,
    backgroundColor: 'rgba(247,241,227,0.1)',
    borderWidth: px(1.5),
    borderColor: 'rgba(247,241,227,0.2)',
  },
  backFocused: { backgroundColor: colors.parchment, borderColor: colors.parchment },
  titles: { flex: 1, gap: px(2) },
  right: { flexDirection: 'row', alignItems: 'center', gap: px(18) },
});
