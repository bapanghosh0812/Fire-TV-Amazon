import React, { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import { DefaultFocus, SpatialNavigationRoot, SpatialNavigationView } from 'react-tv-space-navigation';
import QRCode from 'react-native-qrcode-svg';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { T } from './Typography';
import { card } from './Form';
import { useOverlayBackHandler } from '../remote/hooks';
import { useT } from '../i18n';
import { colors, px, radius } from '../theme/tokens';

const native = Platform.OS !== 'web';

interface Props {
  icon?: IconName;
  title: string;
  body?: string;
  lines?: string[];
  qr?: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm?: () => void;
  onClose: () => void;
  children?: React.ReactNode;
  safeDefault?: boolean; // focus Cancel first (e.g. leaving the app)
}

/** Centered glass dialog for confirmations and information (Back always closes it). */
export function Dialog({ icon = 'info', title, body, lines, qr, confirmLabel, danger, onConfirm, onClose, children, safeDefault }: Props) {
  const t = useT();
  const pop = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(pop, { toValue: 1, useNativeDriver: native, speed: 18, bounciness: 5 }).start();
  }, [pop]);
  useOverlayBackHandler(() => {
    onClose();
    return true;
  });

  return (
    <SpatialNavigationRoot isActive>
      <View style={styles.overlay}>
        <Animated.View style={[styles.dialog, { opacity: pop, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }] }]}>
          <View style={styles.head}>
            <View style={[styles.badge, danger && { backgroundColor: 'rgba(255,107,107,0.14)' }]}>
              <Icon name={icon} size={px(44)} color={danger ? colors.danger : colors.gold} />
            </View>
            <T variant="h2" style={{ flex: 1 }}>
              {title}
            </T>
          </View>
          <View style={styles.content}>
            <View style={{ flex: 1, gap: px(12) }}>
              {body ? (
                <T variant="body" color={colors.muted}>
                  {body}
                </T>
              ) : null}
              {lines?.map((l) => (
                <View key={l} style={{ flexDirection: 'row', gap: px(12) }}>
                  <View style={styles.dot} />
                  <T variant="body" style={{ flex: 1 }}>
                    {l}
                  </T>
                </View>
              ))}
              {children}
            </View>
            {qr ? (
              <View style={styles.qr}>
                <QRCode value={qr} size={px(220)} backgroundColor="#F7F1E3" color="#07061A" />
              </View>
            ) : null}
          </View>
          <SpatialNavigationView direction="horizontal" style={styles.actions}>
            {onConfirm ? (
              <>
                {safeDefault || danger ? (
                  <DefaultFocus>
                    <Button label={t('common.cancel')} kind="ghost" onSelect={onClose} />
                  </DefaultFocus>
                ) : (
                  <Button label={t('common.cancel')} kind="ghost" onSelect={onClose} />
                )}
                {safeDefault || danger ? (
                  <Button label={confirmLabel ?? t('common.ok')} icon={danger ? 'trash' : 'check'} onSelect={onConfirm} />
                ) : (
                  <DefaultFocus>
                    <Button label={confirmLabel ?? t('common.ok')} icon="check" onSelect={onConfirm} />
                  </DefaultFocus>
                )}
              </>
            ) : (
              <DefaultFocus>
                <Button label={t('common.done')} icon="check" onSelect={onClose} />
              </DefaultFocus>
            )}
          </SpatialNavigationView>
        </Animated.View>
      </View>
    </SpatialNavigationRoot>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(3,3,14,0.74)', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  dialog: { ...card, backgroundColor: 'rgba(18,15,48,0.98)', width: px(1180), padding: px(52) },
  head: { flexDirection: 'row', alignItems: 'center', gap: px(24) },
  badge: { width: px(84), height: px(84), borderRadius: px(42), backgroundColor: 'rgba(245,198,107,0.12)', alignItems: 'center', justifyContent: 'center' },
  content: { flexDirection: 'row', gap: px(40), marginTop: px(28) },
  dot: { width: px(10), height: px(10), borderRadius: px(5), backgroundColor: colors.gold, marginTop: px(15) },
  qr: { padding: px(14), backgroundColor: colors.parchment, borderRadius: radius.md, alignSelf: 'flex-start' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: px(18), marginTop: px(40) },
});
