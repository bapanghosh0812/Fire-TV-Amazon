import React, { useRef } from 'react';
import { Platform, StyleSheet, TextInput, View, type KeyboardTypeOptions } from 'react-native';
import { Focusable } from './Focusable';
import { Icon } from './Icon';
import { T } from './Typography';
import { sfx } from '../audio/director';
import { colors, fonts, px, radius } from '../theme/tokens';

/** A large checkbox row that reads well from the sofa. */
export function CheckRow({ checked, label, hint, onToggle }: { checked: boolean; label: string; hint?: string; onToggle: () => void }) {
  return (
    <Focusable
      onSelect={() => {
        sfx('toggle');
        onToggle();
      }}
      radius={radius.md}
      scale={1.02}
    >
      {(focused) => (
        <View style={[styles.check, focused && styles.checkFocused]}>
          <View style={[styles.box, checked && styles.boxOn, focused && !checked && { borderColor: colors.night }]}>
            {checked ? <Icon name="check" size={px(30)} color={colors.night} strokeWidth={3.2} /> : null}
          </View>
          <View style={{ flex: 1 }}>
            <T variant="bodyStrong" color={focused ? colors.night : colors.parchment}>
              {label}
            </T>
            {hint ? (
              <T variant="caption" color={focused ? 'rgba(7,6,26,0.7)' : colors.dim} style={{ letterSpacing: 0, marginTop: px(2) }}>
                {hint}
              </T>
            ) : null}
          </View>
        </View>
      )}
    </Focusable>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  maxLength?: number;
  optional?: string;
  width?: number;
}

/**
 * Text entry for the TV: select the field to open the on-screen keyboard (Fire TV keyboard,
 * or a real keyboard in the browser). Done/Enter closes it again.
 */
export function TextField({ label, value, onChange, placeholder, keyboardType, maxLength = 40, optional, width }: FieldProps) {
  const input = useRef<TextInput>(null);
  return (
    <View style={{ width: width ?? px(620), gap: px(10) }}>
      <View style={{ flexDirection: 'row', gap: px(12), alignItems: 'baseline' }}>
        <T variant="overline" color={colors.gold}>
          {label.toUpperCase()}
        </T>
        {optional ? (
          <T variant="caption" color={colors.dim} style={{ letterSpacing: 0 }}>
            {optional}
          </T>
        ) : null}
      </View>
      <Focusable
        onSelect={() => {
          sfx('select');
          input.current?.focus();
        }}
        radius={radius.md}
        scale={1.02}
      >
        {(focused) => (
          <View style={[styles.field, focused && styles.fieldFocused]}>
            <TextInput
              ref={input}
              value={value}
              onChangeText={onChange}
              placeholder={placeholder}
              placeholderTextColor={focused ? 'rgba(7,6,26,0.45)' : colors.dim}
              keyboardType={keyboardType}
              maxLength={maxLength}
              autoCorrect={false}
              autoCapitalize={keyboardType === 'email-address' ? 'none' : 'words'}
              returnKeyType="done"
              onSubmitEditing={() => input.current?.blur()}
              focusable={Platform.OS === 'web'}
              style={[styles.input, { color: focused ? colors.night : colors.parchment }]}
            />
            <Icon name="text" size={px(28)} color={focused ? colors.night : colors.dim} />
          </View>
        )}
      </Focusable>
    </View>
  );
}

/** Onboarding progress: Language, Sign in, Family, Promise. */
export function StepDots({ steps, current }: { steps: string[]; current: number }) {
  return (
    <View style={styles.steps}>
      {steps.map((s, i) => (
        <View key={s} style={styles.step}>
          <View style={[styles.dot, i < current && styles.dotDone, i === current && styles.dotNow]}>
            {i < current ? <Icon name="check" size={px(18)} color={colors.night} strokeWidth={3.4} /> : null}
          </View>
          <T variant="caption" color={i === current ? colors.parchment : colors.dim} style={{ letterSpacing: 0 }}>
            {s}
          </T>
          {i < steps.length - 1 ? <View style={[styles.line, i < current && styles.lineDone]} /> : null}
        </View>
      ))}
    </View>
  );
}

export const card = {
  backgroundColor: 'rgba(14,12,40,0.82)',
  borderWidth: px(1.5),
  borderColor: 'rgba(245,198,107,0.22)',
  borderRadius: radius.lg,
} as const;

const styles = StyleSheet.create({
  check: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: px(22),
    paddingVertical: px(18),
    paddingHorizontal: px(22),
    borderRadius: radius.md,
    backgroundColor: 'rgba(247,241,227,0.05)',
  },
  checkFocused: { backgroundColor: colors.parchment },
  box: {
    width: px(46),
    height: px(46),
    borderRadius: px(12),
    borderWidth: px(3),
    borderColor: 'rgba(247,241,227,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: px(14),
    height: px(84),
    paddingHorizontal: px(26),
    borderRadius: radius.md,
    backgroundColor: 'rgba(247,241,227,0.07)',
    borderWidth: px(1.5),
    borderColor: colors.line,
  },
  fieldFocused: { backgroundColor: colors.parchment, borderColor: colors.parchment },
  input: { flex: 1, fontFamily: fonts.bodyBold, fontSize: px(32), paddingVertical: 0, outlineStyle: 'none' } as never,
  steps: { flexDirection: 'row', alignItems: 'center' },
  step: { flexDirection: 'row', alignItems: 'center', gap: px(10) },
  dot: {
    width: px(30),
    height: px(30),
    borderRadius: px(15),
    borderWidth: px(2),
    borderColor: 'rgba(247,241,227,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: { backgroundColor: colors.gold, borderColor: colors.gold },
  dotNow: { borderColor: colors.gold, borderWidth: px(4) },
  line: { width: px(54), height: px(2), backgroundColor: 'rgba(247,241,227,0.2)', marginHorizontal: px(12) },
  lineDone: { backgroundColor: colors.gold },
});
