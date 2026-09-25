import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { DefaultFocus, SpatialNavigationRoot, SpatialNavigationScrollView, SpatialNavigationView } from 'react-tv-space-navigation';
import type { AccountRole, AgeBand } from '@storyloom/protocol';
import { Button } from '../components/Button';
import { Focusable } from '../components/Focusable';
import { Icon } from '../components/Icon';
import { Pill } from '../components/Pill';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { useBackHandler } from '../remote/hooks';
import { ScreenHeader } from '../components/ScreenHeader';
import { T } from '../components/Typography';
import { StepDots, TextField, card } from '../components/Form';
import { useSky } from '../components/sky/skyState';
import { sfx } from '../audio/director';
import { homeCountry } from '../data/countries';
import { useT, type StringKey } from '../i18n';
import { continueOnboarding } from '../navigation/onboarding';
import { accountApi, useAccount } from '../services/account';
import { useSettings, type Profile } from '../state/settings';
import { colors, px, radius, safe } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Family'>;

const ROLES: AccountRole[] = ['parent', 'guardian', 'grandparent', 'teacher', 'other'];
const AGES: AgeBand[] = ['little', 'kid', 'big-kid'];
const KID_AVATARS = ['fox', 'owl', 'deer', 'bear', 'whale', 'dragon', 'cat', 'rabbit'];
const COLORS = ['#FF7A6B', '#3FD0C9', '#B69CFF', '#F5C66B', '#7BE8A8', '#FFB3C7'];
const AGE_LABEL: Record<AgeBand, StringKey> = { little: 'parents.age.little', kid: 'parents.age.kid', 'big-kid': 'parents.age.big' };

let seq = 0;
const newId = () => `c-${Date.now().toString(36)}-${seq++}`;

/** "Tell us about your family": the grown-up's details and a profile for each child. */
export function FamilyScreen({ navigation, route }: Props) {
  useSky('center');
  const t = useT();
  const isFocused = useIsFocused();
  const editing = !!route.params?.editing;
  const user = useAccount((s) => s.user);
  const existing = useSettings((s) => s.profiles);
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [role, setRole] = useState<AccountRole>(user?.role ?? 'parent');
  const [kids, setKids] = useState<Profile[]>(
    existing.length
      ? existing
      : (user?.children ?? []).map((c, i) => ({ id: c.id, name: c.name, avatar: c.avatar, ageBand: c.ageBand, color: COLORS[i % COLORS.length] })),
  );
  const [editingKid, setEditingKid] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!name.trim()) {
      sfx('error');
      setError(t('family.needName'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      useSettings.getState().update({ profiles: kids, activeProfileId: kids[0]?.id ?? null });
      if (user) {
        const { user: saved } = await accountApi.saveProfile({
          name: name.trim(),
          email: email.trim(),
          role,
          country: homeCountry().iso,
          language: useSettings.getState().language,
          children: kids.map((k) => ({ id: k.id, name: k.name, ageBand: k.ageBand, avatar: k.avatar })),
        });
        useAccount.getState().setUser(saved);
      }
      sfx('ready');
      if (editing) navigation.goBack();
      else continueOnboarding();
    } catch (e) {
      sfx('error');
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SpatialNavigationRoot isActive={isFocused && !editingKid}>
      <View style={styles.screen}>
        <ScreenHeader
          onBack={() => navigation.goBack()}
          right={editing ? null : <StepDots steps={[t('onb.step.language'), t('onb.step.signin'), t('onb.step.family'), t('onb.step.promise')]} current={2} />}
        />
        <SpatialNavigationScrollView offsetFromStart={px(200)} style={{ flex: 1 }}>
          <View style={styles.content}>
            <T variant="overline" color={colors.gold}>
              {t('family.overline')}
            </T>
            <T variant="h1" style={{ marginTop: px(10) }}>
              {t('family.title')}
            </T>
            <T variant="body" color={colors.muted} style={{ marginTop: px(10) }}>
              {user ? t('family.subtitle', { phone: user.phone }) : t('family.subtitleDemo')}
            </T>

            <SpatialNavigationView direction="vertical" style={{ gap: px(34), marginTop: px(40) }}>
              <SpatialNavigationView direction="horizontal" style={styles.row}>
                <DefaultFocus>
                  <TextField label={t('family.name')} value={name} onChange={setName} placeholder={t('family.namePlaceholder')} />
                </DefaultFocus>
                {user ? (
                  <TextField label={t('family.email')} optional={t('common.optional')} value={email} onChange={setEmail} placeholder="name@example.com" keyboardType="email-address" maxLength={254} />
                ) : null}
              </SpatialNavigationView>

              <View>
                <T variant="overline" color={colors.gold} style={{ marginBottom: px(14) }}>
                  {t('family.role').toUpperCase()}
                </T>
                <SpatialNavigationView direction="horizontal" style={styles.pills}>
                  {ROLES.map((r) => (
                    <Pill key={r} label={t(`family.role.${r}` as StringKey)} selected={role === r} onSelect={() => setRole(r)} />
                  ))}
                </SpatialNavigationView>
              </View>

              <View>
                <T variant="overline" color={colors.gold}>
                  {t('family.kids').toUpperCase()}
                </T>
                <T variant="caption" color={colors.dim} style={{ letterSpacing: 0, marginTop: px(4), marginBottom: px(16) }}>
                  {t('family.kidsHint')}
                </T>
                <SpatialNavigationView direction="horizontal" style={styles.kids}>
                  {kids.map((k) => (
                    <Focusable key={k.id} onSelect={() => setEditingKid(k)} radius={radius.lg} scale={1.06}>
                      {(focused) => (
                        <View style={[styles.kid, focused && styles.kidFocused]}>
                          <ProfileAvatar avatar={k.avatar} size={px(120)} ring={focused ? colors.night : k.color} />
                          <T variant="h3" color={focused ? colors.night : colors.parchment} numberOfLines={1}>
                            {k.name}
                          </T>
                          <T variant="caption" color={focused ? 'rgba(7,6,26,0.65)' : colors.dim} style={{ letterSpacing: 0 }}>
                            {t(AGE_LABEL[k.ageBand])}
                          </T>
                        </View>
                      )}
                    </Focusable>
                  ))}
                  {kids.length < 6 ? (
                    <Focusable
                      onSelect={() => setEditingKid({ id: newId(), name: '', avatar: KID_AVATARS[kids.length % KID_AVATARS.length], ageBand: 'kid', color: COLORS[kids.length % COLORS.length] })}
                      radius={radius.lg}
                      scale={1.06}
                    >
                      {(focused) => (
                        <View style={[styles.kid, styles.addKid, focused && styles.kidFocused]}>
                          <View style={[styles.plus, focused && { borderColor: colors.night }]}>
                            <Icon name="plus" size={px(52)} color={focused ? colors.night : colors.gold} />
                          </View>
                          <T variant="h3" color={focused ? colors.night : colors.parchment}>
                            {t('family.addKid')}
                          </T>
                        </View>
                      )}
                    </Focusable>
                  ) : null}
                </SpatialNavigationView>
              </View>

              {error ? (
                <View style={styles.error}>
                  <Icon name="info" size={px(26)} color={colors.coral} />
                  <T variant="body" color={colors.coral}>
                    {error}
                  </T>
                </View>
              ) : null}

              <SpatialNavigationView direction="horizontal" style={{ flexDirection: 'row', gap: px(20), paddingBottom: px(60) }}>
                {busy ? <ActivityIndicator color={colors.gold} size="large" /> : <Button label={editing ? t('common.save') : t('common.continue')} icon="right" size="lg" onSelect={save} />}
              </SpatialNavigationView>
            </SpatialNavigationView>
          </View>
        </SpatialNavigationScrollView>
      </View>
      {editingKid ? (
        <KidEditor
          kid={editingKid}
          isNew={!kids.some((k) => k.id === editingKid.id)}
          onClose={() => setEditingKid(null)}
          onSave={(k) => {
            setKids((list) => (list.some((x) => x.id === k.id) ? list.map((x) => (x.id === k.id ? k : x)) : [...list, k]));
            setEditingKid(null);
          }}
          onRemove={(id) => {
            setKids((list) => list.filter((x) => x.id !== id));
            setEditingKid(null);
          }}
        />
      ) : null}
    </SpatialNavigationRoot>
  );
}

function KidEditor({ kid, isNew, onClose, onSave, onRemove }: { kid: Profile; isNew: boolean; onClose: () => void; onSave: (k: Profile) => void; onRemove: (id: string) => void }) {
  const t = useT();
  const [draft, setDraft] = useState(kid);
  useBackHandler(() => {
    onClose();
    return true;
  });
  return (
    <SpatialNavigationRoot isActive>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <T variant="h2">{isNew ? t('family.addKid') : t('family.editKid')}</T>
          <SpatialNavigationView direction="vertical" style={{ gap: px(28), marginTop: px(26) }}>
            <DefaultFocus>
              <TextField label={t('family.kidName')} value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} placeholder={t('family.kidPlaceholder')} maxLength={20} width={px(760)} />
            </DefaultFocus>
            <SpatialNavigationView direction="horizontal" style={styles.pills}>
              {AGES.map((a) => (
                <Pill key={a} label={t(AGE_LABEL[a])} selected={draft.ageBand === a} onSelect={() => setDraft({ ...draft, ageBand: a })} />
              ))}
            </SpatialNavigationView>
            <SpatialNavigationView direction="horizontal" style={{ flexDirection: 'row', gap: px(18) }}>
              {KID_AVATARS.map((a) => (
                <Focusable key={a} onSelect={() => setDraft({ ...draft, avatar: a })} radius={px(50)} scale={1.12}>
                  {(focused) => <ProfileAvatar avatar={a} size={px(84)} ring={draft.avatar === a ? colors.gold : focused ? colors.parchment : undefined} />}
                </Focusable>
              ))}
            </SpatialNavigationView>
            <SpatialNavigationView direction="horizontal" style={{ flexDirection: 'row', gap: px(18), marginTop: px(10) }}>
              <Button label={t('common.save')} icon="check" onSelect={() => draft.name.trim() && onSave({ ...draft, name: draft.name.trim() })} disabled={!draft.name.trim()} />
              {!isNew ? <Button label={t('family.removeKid')} icon="trash" kind="ghost" onSelect={() => onRemove(kid.id)} /> : null}
              <Button label={t('common.cancel')} kind="quiet" onSelect={onClose} />
            </SpatialNavigationView>
          </SpatialNavigationView>
        </View>
      </View>
    </SpatialNavigationRoot>
  );
}


const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  content: { paddingHorizontal: safe.x, paddingTop: px(170) },
  row: { flexDirection: 'row', gap: px(30) },
  pills: { flexDirection: 'row', gap: px(14), flexWrap: 'wrap' },
  kids: { flexDirection: 'row', gap: px(24) },
  kid: { ...card, width: px(230), height: px(260), alignItems: 'center', justifyContent: 'center', gap: px(10), padding: px(16) },
  kidFocused: { backgroundColor: colors.parchment, borderColor: colors.parchment },
  addKid: { borderStyle: 'dashed' },
  plus: { width: px(120), height: px(120), borderRadius: px(60), borderWidth: px(3), borderStyle: 'dashed', borderColor: 'rgba(245,198,107,0.6)', alignItems: 'center', justifyContent: 'center' },
  error: { flexDirection: 'row', alignItems: 'center', gap: px(12) },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(3,3,14,0.72)', alignItems: 'center', justifyContent: 'center' },
  sheet: { ...card, padding: px(50), backgroundColor: 'rgba(16,14,44,0.98)' },
});
