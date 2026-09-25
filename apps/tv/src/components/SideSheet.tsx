import React, { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { DefaultFocus, SpatialNavigationRoot, SpatialNavigationScrollView, SpatialNavigationView } from 'react-tv-space-navigation';
import { Focusable } from './Focusable';
import { Icon, type IconName } from './Icon';
import { T } from './Typography';
import { sfx } from '../audio/director';
import { useBackHandler } from '../remote/hooks';
import { colors, px, radius, safe } from '../theme/tokens';

const native = Platform.OS !== 'web';

export interface SheetOption<V extends string | number = string> {
  value: V;
  label: string;
  hint?: string;
  icon?: IconName;
  badge?: string;
  selected?: boolean; // multi-select lists mark each option themselves
}

export interface SheetColumn<V extends string | number = string> {
  title: string;
  icon?: IconName;
  value: V;
  options: SheetOption<V>[];
  onPick: (value: V) => void;
}

interface Props {
  title: string;
  subtitle?: string;
  // Each column is its own list of choices.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: SheetColumn<any>[];
  onClose: () => void;
  width?: number;
}

/**
 * A glass side panel with one or more lists of choices, like the audio and subtitle
 * menu on a streaming app. Up/Down moves in a list, Left/Right switches list, Back closes.
 */
export function SideSheet({ title, subtitle, columns, onClose, width }: Props) {
  const slide = useRef(new Animated.Value(0)).current;
  // Focus starts on the option that was selected when the sheet opened (fixed, so it never jumps).
  const initial = useRef(columns[0]?.value).current;
  useEffect(() => {
    Animated.spring(slide, { toValue: 1, useNativeDriver: native, speed: 18, bounciness: 3 }).start();
  }, [slide]);

  useBackHandler(() => {
    sfx('back');
    onClose();
    return true;
  });

  const w = width ?? px(columns.length > 1 ? 1180 : 640);
  const translateX = slide.interpolate({ inputRange: [0, 1], outputRange: [w, 0] });

  return (
    <SpatialNavigationRoot isActive>
      <View style={StyleSheet.absoluteFill}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(3,3,14,0.55)', opacity: slide }]} />
        <Animated.View style={[styles.panel, { width: w, transform: [{ translateX }] }]}>
          <LinearGradient colors={['rgba(26,22,62,0.97)', 'rgba(9,8,28,0.98)']} style={StyleSheet.absoluteFill} />
          <View style={styles.head}>
            <T variant="h2">{title}</T>
            {subtitle ? (
              <T variant="body" color={colors.muted}>
                {subtitle}
              </T>
            ) : null}
          </View>
          <SpatialNavigationView direction="horizontal" style={styles.columns}>
            {columns.map((col, ci) => (
              <View key={col.title} style={styles.column}>
                <View style={styles.colHead}>
                  {col.icon ? <Icon name={col.icon} size={px(28)} color={colors.gold} /> : null}
                  <T variant="overline" color={colors.gold}>
                    {col.title.toUpperCase()}
                  </T>
                </View>
                <SpatialNavigationScrollView style={styles.list} offsetFromStart={px(120)}>
                  <SpatialNavigationView direction="vertical" style={{ gap: px(10) }}>
                    {col.options.map((opt) => {
                      const selected = opt.selected ?? opt.value === col.value;
                      const row = (
                        <Focusable
                          key={String(opt.value)}
                          onSelect={() => {
                            sfx('toggle');
                            col.onPick(opt.value);
                          }}
                          radius={radius.md}
                          scale={1.03}
                        >
                          {(focused) => (
                            <View style={[styles.row, selected && styles.rowSelected, focused && styles.rowFocused]}>
                              <View style={styles.check}>
                                {selected ? <Icon name="check" size={px(26)} color={focused ? colors.night : colors.gold} strokeWidth={3} /> : null}
                              </View>
                              {opt.icon ? <Icon name={opt.icon} size={px(28)} color={focused ? colors.night : colors.muted} /> : null}
                              <View style={{ flex: 1 }}>
                                <T variant="bodyStrong" color={focused ? colors.night : colors.parchment} numberOfLines={1}>
                                  {opt.label}
                                </T>
                                {opt.hint ? (
                                  <T variant="caption" color={focused ? 'rgba(7,6,26,0.7)' : colors.dim} numberOfLines={1} style={{ letterSpacing: 0 }}>
                                    {opt.hint}
                                  </T>
                                ) : null}
                              </View>
                              {opt.badge ? (
                                <View style={[styles.badge, focused && { borderColor: colors.night }]}>
                                  <T variant="caption" color={focused ? colors.night : colors.gold} style={{ letterSpacing: px(1), fontSize: px(18) }}>
                                    {opt.badge}
                                  </T>
                                </View>
                              ) : null}
                            </View>
                          )}
                        </Focusable>
                      );
                      const first = ci === 0 && (opt.selected === undefined ? opt.value === initial : col.options.indexOf(opt) === 0);
                      return first ? <DefaultFocus key={String(opt.value)}>{row}</DefaultFocus> : row;
                    })}
                  </SpatialNavigationView>
                </SpatialNavigationScrollView>
              </View>
            ))}
          </SpatialNavigationView>
          <View style={styles.foot}>
            <Icon name="back" size={px(24)} color={colors.dim} />
            <T variant="caption" color={colors.dim} style={{ letterSpacing: 0 }}>
              BACK
            </T>
          </View>
        </Animated.View>
      </View>
    </SpatialNavigationRoot>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    borderLeftWidth: px(2),
    borderColor: 'rgba(245,198,107,0.28)',
    overflow: 'hidden',
    paddingTop: safe.y + px(20),
  },
  head: { paddingHorizontal: px(64), gap: px(8), marginBottom: px(30) },
  columns: { flex: 1, flexDirection: 'row', paddingHorizontal: px(64), gap: px(44) },
  column: { flex: 1 },
  colHead: { flexDirection: 'row', alignItems: 'center', gap: px(12), marginBottom: px(18) },
  list: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: px(16),
    minHeight: px(78),
    paddingHorizontal: px(20),
    paddingVertical: px(10),
    borderRadius: radius.md,
    backgroundColor: 'rgba(247,241,227,0.04)',
  },
  rowSelected: { backgroundColor: 'rgba(245,198,107,0.1)' },
  rowFocused: { backgroundColor: colors.parchment },
  check: { width: px(30), alignItems: 'center' },
  badge: { borderWidth: px(1.5), borderColor: 'rgba(245,198,107,0.6)', borderRadius: px(8), paddingHorizontal: px(10), paddingVertical: px(2) },
  foot: { flexDirection: 'row', alignItems: 'center', gap: px(10), paddingHorizontal: px(64), paddingVertical: px(28) },
});
