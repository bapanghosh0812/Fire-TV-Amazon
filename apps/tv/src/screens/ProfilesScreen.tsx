import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { DefaultFocus, SpatialNavigationRoot, SpatialNavigationView } from 'react-tv-space-navigation';
import { Button } from '../components/Button';
import { Focusable } from '../components/Focusable';
import { Logo } from '../components/Logo';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { T } from '../components/Typography';
import { useSky } from '../components/sky/skyState';
import { sfx } from '../audio/director';
import { useT, type StringKey } from '../i18n';
import { useAccount } from '../services/account';
import { useSettings } from '../state/settings';
import { colors, px, radius, safe } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Profiles'>;
const native = Platform.OS !== 'web';
const AGE: Record<string, StringKey> = { little: 'parents.age.little', kid: 'parents.age.kid', 'big-kid': 'parents.age.big' };

/** "Who's listening tonight?": each child's stories, age and voice settings follow their profile. */
export function ProfilesScreen({ navigation }: Props) {
  useSky('center');
  const t = useT();
  const isFocused = useIsFocused();
  const profiles = useSettings((s) => s.profiles);
  const active = useSettings((s) => s.activeProfileId);
  const user = useAccount((s) => s.user);
  const intro = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(intro, { toValue: 1, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: native }).start();
  }, [intro]);

  const choose = (id: string | null, ageBand?: string) => {
    sfx('select');
    useSettings.getState().update({ activeProfileId: id, ...(ageBand ? { ageBand: ageBand as never } : null) });
    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  };

  return (
    <SpatialNavigationRoot isActive={isFocused}>
      <View style={styles.screen}>
        <Logo />
        <Animated.View style={{ opacity: intro, transform: [{ scale: intro.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }], alignItems: 'center' }}>
          <T variant="hero" align="center" style={{ marginTop: px(40) }}>
            {t('profiles.title')}
          </T>
          <SpatialNavigationView direction="horizontal" style={styles.row}>
            {profiles.map((p) => {
              const tile = (
                <Focusable key={p.id} onSelect={() => choose(p.id, p.ageBand)} radius={px(110)} scale={1.1} ringColor={p.color}>
                  {(focused) => (
                    <View style={styles.tile}>
                      <ProfileAvatar avatar={p.avatar} size={px(210)} ring={focused ? colors.parchment : p.color} />
                    </View>
                  )}
                </Focusable>
              );
              return (
                <View key={p.id} style={styles.person}>
                  {p.id === active ? <DefaultFocus>{tile}</DefaultFocus> : tile}
                  <T variant="h3" align="center" style={{ marginTop: px(20) }}>
                    {p.name}
                  </T>
                  <T variant="caption" color={colors.dim} align="center" style={{ letterSpacing: 0 }}>
                    {t(AGE[p.ageBand])}
                  </T>
                </View>
              );
            })}
            <View style={styles.person}>
              <Focusable onSelect={() => choose(null)} radius={px(110)} scale={1.1}>
                {() => (
                  <View style={styles.tile}>
                    <ProfileAvatar avatar="grownup" size={px(210)} />
                  </View>
                )}
              </Focusable>
              <T variant="h3" align="center" style={{ marginTop: px(20) }}>
                {user?.name || t('profiles.grownup')}
              </T>
              <T variant="caption" color={colors.dim} align="center" style={{ letterSpacing: 0 }}>
                {t('profiles.grownupHint')}
              </T>
            </View>
          </SpatialNavigationView>
          <View style={{ marginTop: px(60) }}>
            <Button label={t('profiles.manage')} icon="settings" kind="ghost" onSelect={() => navigation.navigate('Family', { editing: true })} />
          </View>
        </Animated.View>
      </View>
    </SpatialNavigationRoot>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center', paddingHorizontal: safe.x },
  row: { flexDirection: 'row', gap: px(56), marginTop: px(70) },
  person: { alignItems: 'center', width: px(250) },
  tile: { borderRadius: px(110) },
});
