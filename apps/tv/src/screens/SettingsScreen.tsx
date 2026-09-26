import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Application from 'expo-application';
import { DefaultFocus, SpatialNavigationRoot, SpatialNavigationScrollView, SpatialNavigationView } from 'react-tv-space-navigation';
import { Dialog } from '../components/Dialog';
import { Focusable } from '../components/Focusable';
import { Icon } from '../components/Icon';
import { PinGate } from '../components/PinGate';
import { ProfileAvatar } from '../components/ProfileAvatar';
import { ScreenHeader } from '../components/ScreenHeader';
import { SideSheet } from '../components/SideSheet';
import { T } from '../components/Typography';
import { card } from '../components/Form';
import { useSky } from '../components/sky/skyState';
import { ReadAlongText } from '../player/ReadAlongText';
import { sfx } from '../audio/director';
import { useBackHandler } from '../remote/hooks';
import { useT, type StringKey, type Translate } from '../i18n';
import { SECTIONS, optionCount, type Action, type Item, type Option, type Section } from '../settings/schema';
import { accountApi, useAccount } from '../services/account';
import { config } from '../services/config';
import { useLibrary } from '../state/library';
import { useToast } from '../state/toast';
import { DEFAULT_SETTINGS, useSettings, type Settings } from '../state/settings';
import { colors, fonts, px, radius, safe } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;
type PageItem = Extract<Item, { kind: 'page' }>;

const label = (t: Translate, l: string) => (l.includes('.') && !l.includes(' ') ? t(l as StringKey) : l);

export function SettingsScreen({ navigation, route }: Props) {
  useSky('left');
  const t = useT();
  const isFocused = useIsFocused();
  const settings = useSettings();
  const user = useAccount((s) => s.user);
  const [sectionId, setSectionId] = useState(route.params?.section ?? 'account');
  // Where focus starts. It must not move while browsing, or the focus tree re-mounts.
  const [firstSection] = useState(sectionId);
  const [stack, setStack] = useState<PageItem[]>([]);
  const [sheet, setSheet] = useState<Extract<Item, { kind: 'choice' | 'multi' }> | null>(null);
  const [dialog, setDialog] = useState<React.ReactNode>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [pinMode, setPinMode] = useState<'create' | null>(null);
  const section = SECTIONS.find((s) => s.id === sectionId) ?? SECTIONS[0];
  const items = stack.length ? stack[stack.length - 1].items : section.items;
  const locked = !!section.pin && settings.pinSet && settings.pinForSettings && !unlocked;
  const overlay = !!sheet || !!dialog || !!pinMode;
  const total = useMemo(() => optionCount(), []);

  const toast = (m: string) => useToast.getState().show(m);

  // Back leaves a nested page first, then Settings.
  useBackHandler(() => {
    if (!stack.length) return false;
    sfx('back');
    setStack((s) => s.slice(0, -1));
    return true;
  }, !overlay);

  const openSection = (id: string) => {
    if (id === sectionId) return;
    setSectionId(id);
    setStack([]);
  };

  const confirm = (title: StringKey, body: StringKey, run: () => Promise<void> | void, danger = true) =>
    setDialog(
      <Dialog
        icon={danger ? 'trash' : 'info'}
        title={t(title)}
        body={t(body)}
        danger={danger}
        confirmLabel={t('common.confirm')}
        onClose={() => setDialog(null)}
        onConfirm={async () => {
          setDialog(null);
          try {
            await run();
          } catch (e) {
            toast((e as Error).message);
          }
        }}
      />,
    );

  const info = (title: string, lines: string[], qr?: string, icon: 'info' | 'star' | 'data' | 'remote' | 'heart' | 'download' = 'info', body?: string) =>
    setDialog(<Dialog icon={icon} title={title} body={body} lines={lines} qr={qr} onClose={() => setDialog(null)} />);

  const run = (id: Action) => {
    switch (id) {
      case 'signIn':
        return navigation.navigate('SignIn');
      case 'editFamily':
        return navigation.navigate('Family', { editing: true });
      case 'appLanguage':
        return navigation.navigate('Language', { fromSettings: true });
      case 'signOut':
        return confirm('settings.account.signOut', 'settings.account.signOutConfirm', async () => {
          await useAccount.getState().signOut();
          toast(t('settings.toast.signedOut'));
        }, false);
      case 'signOutAll':
        return confirm('settings.account.signOutAll', 'settings.account.signOutAllConfirm', async () => {
          await accountApi.signOutEverywhere();
          await useAccount.getState().signOut();
          toast(t('settings.toast.signedOutAll'));
        });
      case 'deleteAccount':
        return confirm('settings.account.delete', 'settings.account.deleteConfirm', async () => {
          await accountApi.deleteAccount();
          await useAccount.getState().signOut();
          useSettings.getState().update({ ...DEFAULT_SETTINGS, language: useSettings.getState().language, languageChosen: true });
          navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
        });
      case 'pin':
        return setPinMode('create');
      case 'removePin':
        return confirm('settings.par.removePin', 'settings.par.removePinConfirm', async () => {
          await useSettings.getState().setPin(null);
          toast(t('settings.toast.pinRemoved'));
        });
      case 'clearMemory':
        return confirm('settings.priv.clearMemory', 'settings.priv.clearMemoryConfirm', () => toast(t('settings.toast.memoryCleared')), false);
      case 'deleteHistory':
        return confirm('settings.priv.deleteHistory', 'settings.priv.deleteHistoryConfirm', async () => {
          const cloud = await import('../services/cloud');
          await cloud.deleteAllStories().catch(() => {});
          useLibrary.getState().resetToSeed();
          toast(t('settings.toast.historyDeleted'));
        });
      case 'downloadData':
        return info(t('settings.priv.download'), [t('settings.priv.downloadLine1'), t('settings.priv.downloadLine2')], `${config.companionBaseUrl}/account`, 'download');
      case 'terms':
        return navigation.navigate('Terms', { mode: 'read', doc: 'terms' });
      case 'privacy':
        return navigation.navigate('Terms', { mode: 'read', doc: 'privacy' });
      case 'children':
        return navigation.navigate('Terms', { mode: 'read', doc: 'children' });
      case 'licenses':
        return info(t('settings.about.licenses'), [
          'React Native for TV (react-native-tvos) · MIT',
          'Expo SDK 54 · MIT',
          'react-tv-space-navigation · MIT',
          'React Navigation · MIT',
          'Zustand · MIT',
          'react-native-svg · MIT',
          'react-native-qrcode-svg · MIT',
          'Fraunces & Nunito fonts · SIL Open Font License 1.1',
          'AWS SDK for JavaScript · Apache-2.0',
        ], undefined, 'data');
      case 'credits':
        return info(t('settings.about.credits'), [
          t('credits.bapan'),
          t('credits.jayashree'),
          t('credits.music'),
          t('credits.sky'),
          t('credits.aws'),
        ], undefined, 'star', t('credits.body'));
      case 'contact':
        return info(t('settings.about.contact'), [t('settings.contact.line1'), t('settings.contact.line2')], `${config.companionBaseUrl}/contact`, 'heart');
      case 'replayTour':
        return navigation.navigate('Welcome');
      case 'resetSettings':
        return confirm('settings.about.reset', 'settings.about.resetConfirm', () => {
          useSettings.getState().reset();
          toast(t('settings.toast.reset'));
        });
      case 'remoteGuide':
        return info(t('settings.rem.guide'), [t('remote.dpad'), t('remote.select'), t('remote.back'), t('remote.play'), t('remote.ffrw'), t('remote.alexa')], undefined, 'remote');
    }
  };

  return (
    <SpatialNavigationRoot isActive={isFocused && !overlay}>
      <View style={styles.screen}>
        <ScreenHeader
          onBack={() => (stack.length ? setStack((s) => s.slice(0, -1)) : navigation.goBack())}
          overline={t('settings.overline', { n: total })}
          title={t('settings.title')}
          right={
            user ? (
              <View style={styles.who}>
                <ProfileAvatar avatar="grownup" size={px(52)} />
                <View>
                  <T variant="bodyStrong">{user.name || t('profiles.grownup')}</T>
                  <T variant="caption" color={colors.dim} style={{ letterSpacing: 0 }}>
                    {user.phone}
                  </T>
                </View>
              </View>
            ) : (
              <T variant="caption" color={colors.dim} style={{ letterSpacing: 0 }}>
                {t('settings.account.notSignedIn')}
              </T>
            )
          }
        />
        <SpatialNavigationView direction="horizontal" style={styles.body}>
          {/* Sections */}
          <SpatialNavigationScrollView style={styles.nav} offsetFromStart={px(140)}>
            <SpatialNavigationView direction="vertical" style={{ gap: px(6), paddingBottom: px(40) }}>
              {SECTIONS.map((s) => {
                const row = (
                  <Focusable key={s.id} onFocus={() => openSection(s.id)} onSelect={() => openSection(s.id)} radius={radius.md} scale={1.03}>
                    {(focused) => (
                      <View style={[styles.navRow, s.id === sectionId && styles.navActive, focused && styles.navFocused]}>
                        <Icon name={s.icon} size={px(32)} color={focused ? colors.night : s.id === sectionId ? colors.gold : colors.muted} />
                        <T variant="bodyStrong" color={focused ? colors.night : colors.parchment} numberOfLines={1} style={{ flex: 1 }}>
                          {t(s.label)}
                        </T>
                        {s.pin && settings.pinSet ? <Icon name="lock" size={px(22)} color={focused ? colors.night : colors.dim} /> : null}
                      </View>
                    )}
                  </Focusable>
                );
                return s.id === firstSection ? <DefaultFocus key={s.id}>{row}</DefaultFocus> : row;
              })}
            </SpatialNavigationView>
          </SpatialNavigationScrollView>

          {/* Section content (and nested pages) */}
          <View style={styles.panel}>
            <View style={styles.crumbs}>
              <Icon name={section.icon} size={px(34)} color={colors.gold} />
              <T variant="h2">{t(section.label)}</T>
              {stack.map((p) => (
                <React.Fragment key={p.id}>
                  <Icon name="right" size={px(28)} color={colors.dim} />
                  <T variant="h2" color={colors.goldBright}>
                    {t(p.label)}
                  </T>
                </React.Fragment>
              ))}
            </View>
            {locked ? (
              <View style={{ flex: 1, justifyContent: 'center' }}>
                <PinGate mode="enter" onUnlocked={() => setUnlocked(true)} />
              </View>
            ) : (
              <SpatialNavigationScrollView key={`${sectionId}-${stack.length}`} style={{ flex: 1 }} offsetFromStart={px(180)}>
                <SpatialNavigationView direction="vertical" style={{ gap: px(10), paddingBottom: px(80) }}>
                  {items
                    .filter((it) => !(it.kind === 'action' && it.id === 'signIn' && user))
                    .filter((it) => !(it.kind === 'page' && it.id === 'security' && !user))
                    .map((it, i) => (
                      <Row
                        key={i}
                        item={it}
                        settings={settings}
                        t={t}
                        onOpenPage={(p) => {
                          sfx('select');
                          setStack((s) => [...s, p]);
                        }}
                        onOpenSheet={setSheet}
                        onAction={run}
                        user={user}
                      />
                    ))}
                </SpatialNavigationView>
              </SpatialNavigationScrollView>
            )}
          </View>
        </SpatialNavigationView>
      </View>

      {sheet ? <ChoiceSheet item={sheet} settings={settings} onClose={() => setSheet(null)} /> : null}
      {dialog}
      {pinMode ? (
        <View style={styles.pinOverlay}>
          <SpatialNavigationRoot isActive>
            <PinGate
              mode="create"
              onUnlocked={() => {
                setPinMode(null);
                setUnlocked(true);
                toast(t('settings.toast.pinSet'));
              }}
            />
          </SpatialNavigationRoot>
          <BackCloser onBack={() => setPinMode(null)} />
        </View>
      ) : null}
    </SpatialNavigationRoot>
  );
}

function BackCloser({ onBack }: { onBack: () => void }) {
  useBackHandler(() => {
    onBack();
    return true;
  });
  return null;
}

// ------------------------------------------------------------------ rows

interface RowProps {
  item: Item;
  settings: Settings;
  t: Translate;
  user: ReturnType<typeof useAccount.getState>['user'];
  onOpenPage: (p: PageItem) => void;
  onOpenSheet: (i: Extract<Item, { kind: 'choice' | 'multi' }>) => void;
  onAction: (id: Action) => void;
}

function valueLabel(item: Extract<Item, { kind: 'choice' }>, value: unknown, t: Translate) {
  const current = typeof value === 'boolean' ? Number(value) : value;
  const opt = item.options.find((o) => o.value === current);
  return opt ? label(t, opt.label as string) : String(value ?? '');
}

function Row({ item, settings, t, user, onOpenPage, onOpenSheet, onAction }: RowProps) {
  const update = useSettings.getState().update;
  if (item.kind === 'preview') return <CaptionPreview settings={settings} />;

  if (item.kind === 'slider') {
    const v = Number(settings[item.key]);
    const set = (n: number) => {
      sfx('toggle');
      update({ [item.key]: Math.round(Math.min(item.max, Math.max(item.min, n)) * 100) / 100 } as Partial<Settings>);
    };
    return (
      <View style={styles.row}>
        {item.icon ? <Icon name={item.icon} size={px(32)} color={colors.gold} /> : null}
        <View style={{ flex: 1 }}>
          <T variant="bodyStrong">{t(item.label)}</T>
        </View>
        <SpatialNavigationView direction="horizontal" style={styles.slider}>
          <MiniButton icon="left" onSelect={() => set(v - item.step)} />
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${((v - item.min) / (item.max - item.min)) * 100}%` }]} />
          </View>
          <MiniButton icon="right" onSelect={() => set(v + item.step)} />
          <T variant="bodyStrong" color={colors.goldBright} style={{ width: px(90), textAlign: 'right' }}>
            {Math.round(v * 100)}%
          </T>
        </SpatialNavigationView>
      </View>
    );
  }

  return (
    <Focusable
      onSelect={() => {
        if (item.kind === 'toggle') {
          sfx('toggle');
          update({ [item.key]: !settings[item.key] } as Partial<Settings>);
        } else if (item.kind === 'choice' || item.kind === 'multi') {
          sfx('select');
          onOpenSheet(item);
        } else if (item.kind === 'page') onOpenPage(item);
        else if (item.kind === 'action') {
          sfx('select');
          onAction(item.id);
        }
      }}
      radius={radius.md}
      scale={1.015}
    >
      {(focused) => {
        const fg = focused ? colors.night : colors.parchment;
        const sub = focused ? 'rgba(7,6,26,0.68)' : colors.dim;
        const danger = item.kind === 'action' && item.danger;
        let right: React.ReactNode = null;
        let hint: string | undefined = 'hint' in item && item.hint ? t(item.hint) : undefined;
        if (item.kind === 'toggle') right = <Switch on={!!settings[item.key]} focused={focused} />;
        else if (item.kind === 'choice')
          right = (
            <View style={styles.value}>
              <T variant="bodyStrong" color={focused ? colors.night : colors.goldBright} numberOfLines={1}>
                {valueLabel(item, settings[item.key], t)}
              </T>
              <Icon name="right" size={px(26)} color={sub} />
            </View>
          );
        else if (item.kind === 'multi') {
          const n = (settings[item.key] as string[]).length;
          right = (
            <View style={styles.value}>
              <T variant="bodyStrong" color={focused ? colors.night : colors.goldBright}>
                {n ? t('settings.selected', { n }) : t('settings.none')}
              </T>
              <Icon name="right" size={px(26)} color={sub} />
            </View>
          );
        } else if (item.kind === 'page' || item.kind === 'action') right = <Icon name="right" size={px(28)} color={sub} />;
        else if (item.kind === 'info') {
          const value =
            item.id === 'version'
              ? `${Application.nativeApplicationVersion ?? '1.0.0'} (${Application.nativeBuildVersion ?? 'web'})`
              : item.id === 'phone'
                ? (user?.phone ?? '—')
                : user
                  ? `${user.name || t('profiles.grownup')} · ${user.phone}`
                  : t('settings.account.demo');
          right = (
            <T variant="bodyStrong" color={focused ? colors.night : colors.goldBright} numberOfLines={1}>
              {value}
            </T>
          );
          hint = undefined;
        }
        return (
          <View style={[styles.row, focused && styles.rowFocused]}>
            {'icon' in item && item.icon ? <Icon name={item.icon} size={px(32)} color={focused ? colors.night : danger ? colors.danger : colors.gold} /> : null}
            <View style={{ flex: 1 }}>
              <T variant="bodyStrong" color={danger && !focused ? colors.danger : fg}>
                {t(item.label)}
              </T>
              {hint ? (
                <T variant="caption" color={sub} style={{ letterSpacing: 0, marginTop: px(2) }} numberOfLines={2}>
                  {hint}
                </T>
              ) : null}
            </View>
            {right}
          </View>
        );
      }}
    </Focusable>
  );
}

function MiniButton({ icon, onSelect }: { icon: 'left' | 'right'; onSelect: () => void }) {
  return (
    <Focusable onSelect={onSelect} radius={px(30)} scale={1.12}>
      {(focused) => (
        <View style={[styles.mini, focused && { backgroundColor: colors.parchment }]}>
          <Icon name={icon} size={px(28)} color={focused ? colors.night : colors.parchment} strokeWidth={2.6} />
        </View>
      )}
    </Focusable>
  );
}

function Switch({ on, focused }: { on: boolean; focused: boolean }) {
  return (
    <View style={[styles.switch, on && styles.switchOn, focused && !on && { borderColor: colors.night }]}>
      <View style={[styles.knob, on ? styles.knobOn : null, focused && !on && { backgroundColor: colors.night }]} />
    </View>
  );
}

function ChoiceSheet({ item, settings, onClose }: { item: Extract<Item, { kind: 'choice' | 'multi' }>; settings: Settings; onClose: () => void }) {
  const t = useT();
  const update = useSettings.getState().update;
  const current = settings[item.key];
  const opts = (o: Option) => ({ value: o.value, label: label(t, o.label as string), hint: o.hint ? t(o.hint) : undefined });
  if (item.kind === 'multi') {
    const list = current as string[];
    return (
      <SideSheet
        title={t(item.label)}
        subtitle={item.hint ? t(item.hint) : undefined}
        onClose={onClose}
        columns={[
          {
            title: t(item.label),
            icon: item.icon,
            value: '',
            options: item.options.map((o) => ({ ...opts(o), selected: list.includes(String(o.value)) })),
            onPick: (v: string) => update({ [item.key]: list.includes(v) ? list.filter((x) => x !== v) : [...list, v] } as Partial<Settings>),
          },
        ]}
      />
    );
  }
  const isBool = typeof current === 'boolean';
  return (
    <SideSheet
      title={t(item.label)}
      subtitle={item.hint ? t(item.hint) : undefined}
      onClose={onClose}
      columns={[
        {
          title: t(item.label),
          icon: item.icon,
          value: isBool ? Number(current) : current,
          options: item.options.map(opts),
          onPick: (v: string | number) => {
            update({ [item.key]: isBool ? Boolean(v) : v } as Partial<Settings>);
            onClose();
          },
        },
      ]}
    />
  );
}

// Words for Latin/Devanagari text; CJK has no spaces, so it highlights two characters at a time.
const PREVIEW_WORDS = /[぀-ヿ㐀-鿿]{1,2}[、。！？]?|\S+/g;
const SIZE = { s: 0.78, m: 1, l: 1.18, xl: 1.36 } as const;
const COLOR = { parchment: colors.parchment, white: '#FFFFFF', yellow: '#FFE27A', cyan: '#9EF3FF' } as const;
const FONT = { story: fonts.body, rounded: fonts.bodyBold, readable: fonts.bodyBlack } as const;

function CaptionPreview({ settings }: { settings: Settings }) {
  const t = useT();
  const text = t('settings.cap.preview');
  const marks = useMemo(() => {
    const out: { t: number; s: number; e: number }[] = [];
    const re = new RegExp(PREVIEW_WORDS);
    let m: RegExpExecArray | null;
    let i = 0;
    while ((m = re.exec(text))) out.push({ t: i++ * 300, s: m.index, e: m.index + m[0].length });
    return out;
  }, [text]);
  return (
    <View style={styles.preview}>
      <View style={settings.captionBackground === 'box' ? styles.previewBox : undefined}>
        <ReadAlongText
          text={text}
          marks={marks}
          activeIndex={Math.min(4, marks.length - 1)}
          highlight={settings.readAlong}
          mode={settings.highlightStyle}
          color={COLOR[settings.captionColor]}
          style={{
            fontFamily: FONT[settings.captionFont],
            fontSize: px(38) * SIZE[settings.captionSize],
            lineHeight: px(54) * SIZE[settings.captionSize],
            ...(settings.captionBackground === 'shadow' ? { textShadowColor: 'rgba(0,0,0,0.85)', textShadowRadius: 10 } : null),
          }}
        />
      </View>
    </View>
  );
}

export type { Section };

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent', paddingTop: px(150) },
  body: { flex: 1, flexDirection: 'row', paddingHorizontal: safe.x, gap: px(34), paddingBottom: safe.y },
  who: { flexDirection: 'row', alignItems: 'center', gap: px(14) },
  nav: { width: px(470) },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: px(18), height: px(74), paddingHorizontal: px(22), borderRadius: radius.md },
  navActive: { backgroundColor: 'rgba(245,198,107,0.1)' },
  navFocused: { backgroundColor: colors.parchment },
  panel: { flex: 1, ...card, paddingHorizontal: px(40), paddingTop: px(34) },
  crumbs: { flexDirection: 'row', alignItems: 'center', gap: px(14), marginBottom: px(24) },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: px(22),
    minHeight: px(96),
    paddingHorizontal: px(26),
    paddingVertical: px(14),
    borderRadius: radius.md,
    backgroundColor: 'rgba(247,241,227,0.04)',
  },
  rowFocused: { backgroundColor: colors.parchment },
  value: { flexDirection: 'row', alignItems: 'center', gap: px(10), maxWidth: px(420) },
  switch: { width: px(84), height: px(46), borderRadius: px(23), borderWidth: px(3), borderColor: 'rgba(247,241,227,0.4)', justifyContent: 'center', paddingHorizontal: px(4) },
  switchOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  knob: { width: px(32), height: px(32), borderRadius: px(16), backgroundColor: 'rgba(247,241,227,0.7)' },
  knobOn: { alignSelf: 'flex-end', backgroundColor: colors.night },
  slider: { flexDirection: 'row', alignItems: 'center', gap: px(16) },
  track: { width: px(260), height: px(12), borderRadius: px(6), backgroundColor: 'rgba(247,241,227,0.18)', overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.gold },
  mini: { width: px(60), height: px(60), borderRadius: px(30), backgroundColor: 'rgba(247,241,227,0.1)', alignItems: 'center', justifyContent: 'center' },
  preview: { borderRadius: radius.md, padding: px(30), backgroundColor: '#1a1440', marginBottom: px(8), minHeight: px(170), justifyContent: 'center' },
  previewBox: { backgroundColor: 'rgba(3,3,14,0.72)', borderRadius: radius.md, paddingHorizontal: px(24), paddingVertical: px(14) },
  pinOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(3,3,14,0.9)', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
});
