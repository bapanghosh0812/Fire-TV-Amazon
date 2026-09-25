import type { IconName } from '../components/Icon';
import type { StringKey } from '../i18n';
import type { Settings } from '../state/settings';

// Everything in Settings is described here; the screen renders it. Adding an option = one entry.

export type Option = { value: string | number; label: StringKey | string; hint?: StringKey };

export type Action =
  | 'signIn'
  | 'editFamily'
  | 'signOut'
  | 'signOutAll'
  | 'deleteAccount'
  | 'appLanguage'
  | 'pin'
  | 'removePin'
  | 'clearMemory'
  | 'deleteHistory'
  | 'downloadData'
  | 'terms'
  | 'privacy'
  | 'children'
  | 'licenses'
  | 'credits'
  | 'contact'
  | 'replayTour'
  | 'resetSettings'
  | 'remoteGuide';

export type Item =
  | { kind: 'toggle'; key: keyof Settings; label: StringKey; hint?: StringKey; icon?: IconName }
  | { kind: 'choice'; key: keyof Settings; label: StringKey; hint?: StringKey; icon?: IconName; options: Option[] }
  | { kind: 'slider'; key: keyof Settings; label: StringKey; hint?: StringKey; icon?: IconName; min: number; max: number; step: number }
  | { kind: 'multi'; key: keyof Settings; label: StringKey; hint?: StringKey; icon?: IconName; options: Option[] }
  | { kind: 'page'; id: string; label: StringKey; hint?: StringKey; icon: IconName; items: Item[] }
  | { kind: 'action'; id: Action; label: StringKey; hint?: StringKey; icon: IconName; danger?: boolean }
  | { kind: 'info'; id: 'account' | 'version' | 'storage' | 'phone'; label: StringKey; icon?: IconName }
  | { kind: 'preview'; id: 'captions' };

export interface Section {
  id: string;
  label: StringKey;
  icon: IconName;
  pin?: boolean; // grown-ups only when a PIN is set
  items: Item[];
}

const pct = (n: number) => ({ value: n, label: `${Math.round(n * 100)}%` });

const LANG_TRACKS: Option[] = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिन्दी' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'pt', label: 'Português' },
  { value: 'ja', label: '日本語' },
  { value: 'ar', label: 'العربية' },
];

const TIMES: Option[] = ['18:30', '19:00', '19:30', '19:45', '20:00', '20:30', '21:00', '21:30', '22:00'].map((v) => ({ value: v, label: v }));
const MORNINGS: Option[] = ['05:30', '06:00', '06:30', '07:00', '07:30', '08:00'].map((v) => ({ value: v, label: v }));

export const SECTIONS: Section[] = [
  {
    id: 'account',
    label: 'settings.sec.account',
    icon: 'user',
    items: [
      { kind: 'info', id: 'account', label: 'settings.account.signedIn', icon: 'user' },
      { kind: 'action', id: 'editFamily', label: 'settings.account.family', hint: 'settings.account.familyHint', icon: 'family' },
      { kind: 'action', id: 'signIn', label: 'settings.account.signIn', hint: 'settings.account.signInHint', icon: 'phone' },
      {
        kind: 'page',
        id: 'security',
        label: 'settings.account.security',
        hint: 'settings.account.securityHint',
        icon: 'shield',
        items: [
          { kind: 'info', id: 'phone', label: 'settings.account.phone', icon: 'phone' },
          { kind: 'action', id: 'signOut', label: 'settings.account.signOut', hint: 'settings.account.signOutHint', icon: 'logout' },
          { kind: 'action', id: 'signOutAll', label: 'settings.account.signOutAll', hint: 'settings.account.signOutAllHint', icon: 'logout' },
          { kind: 'action', id: 'deleteAccount', label: 'settings.account.delete', hint: 'settings.account.deleteHint', icon: 'trash', danger: true },
        ],
      },
    ],
  },
  {
    id: 'language',
    label: 'settings.sec.language',
    icon: 'globe',
    items: [
      { kind: 'action', id: 'appLanguage', label: 'settings.lang.app', hint: 'settings.lang.appHint', icon: 'globe' },
      {
        kind: 'choice',
        key: 'storyLanguage',
        label: 'settings.lang.story',
        hint: 'settings.lang.storyHint',
        icon: 'book',
        options: [
          { value: 'en-US', label: 'English (US)' },
          { value: 'en-GB', label: 'English (UK)' },
          { value: 'en-IN', label: 'English (India)' },
          { value: 'hi-IN', label: 'हिन्दी' },
          { value: 'es-ES', label: 'Español' },
          { value: 'es-MX', label: 'Español (México)' },
          { value: 'fr-FR', label: 'Français' },
          { value: 'de-DE', label: 'Deutsch' },
          { value: 'it-IT', label: 'Italiano' },
          { value: 'pt-BR', label: 'Português (Brasil)' },
          { value: 'ja-JP', label: '日本語' },
          { value: 'ko-KR', label: '한국어' },
          { value: 'ar-AE', label: 'العربية' },
          { value: 'cmn-CN', label: '中文' },
        ],
      },
      { kind: 'choice', key: 'audioLanguage', label: 'settings.lang.audio', hint: 'settings.lang.audioHint', icon: 'volume', options: [{ value: 'original', label: 'settings.lang.original' }, ...LANG_TRACKS] },
      {
        kind: 'choice',
        key: 'captionLanguage',
        label: 'settings.lang.captions',
        hint: 'settings.lang.captionsHint',
        icon: 'subtitles',
        options: [{ value: 'same', label: 'player.subsSame' }, { value: 'off', label: 'player.subsOff' }, ...LANG_TRACKS],
      },
      { kind: 'toggle', key: 'clock24h', label: 'settings.lang.clock24', icon: 'clock' },
    ],
  },
  {
    id: 'playback',
    label: 'settings.sec.playback',
    icon: 'play',
    items: [
      { kind: 'toggle', key: 'autoAdvance', label: 'settings.play.autoAdvance', hint: 'settings.play.autoAdvanceHint', icon: 'book' },
      { kind: 'toggle', key: 'autoplayNext', label: 'settings.play.autoplayNext', hint: 'settings.play.autoplayNextHint', icon: 'next' },
      {
        kind: 'choice',
        key: 'narrationSpeed',
        label: 'settings.play.speed',
        icon: 'speed',
        options: [
          { value: 0.75, label: '0.75×' },
          { value: 0.9, label: '0.9×' },
          { value: 1, label: 'player.speedNormal' },
          { value: 1.1, label: '1.1×' },
          { value: 1.25, label: '1.25×' },
        ],
      },
      {
        kind: 'choice',
        key: 'pagePause',
        label: 'settings.play.pause',
        hint: 'settings.play.pauseHint',
        icon: 'timer',
        options: [
          { value: 0.6, label: 'settings.opt.short' },
          { value: 1.2, label: 'settings.opt.normal' },
          { value: 2.5, label: 'settings.opt.long' },
        ],
      },
      { kind: 'toggle', key: 'readAlong', label: 'settings.play.readAlong', hint: 'settings.play.readAlongHint', icon: 'text' },
      {
        kind: 'choice',
        key: 'highlightStyle',
        label: 'settings.play.highlight',
        icon: 'sparkle',
        options: [
          { value: 'glow', label: 'settings.opt.glow' },
          { value: 'underline', label: 'settings.opt.underline' },
          { value: 'box', label: 'settings.opt.box' },
        ],
      },
      { kind: 'toggle', key: 'resume', label: 'settings.play.resume', hint: 'settings.play.resumeHint', icon: 'refresh' },
      {
        kind: 'choice',
        key: 'quality',
        label: 'settings.play.quality',
        hint: 'settings.play.qualityHint',
        icon: 'quality',
        options: [
          { value: 'auto', label: 'settings.opt.auto', hint: 'settings.opt.autoQualityHint' },
          { value: 'best', label: 'settings.opt.best', hint: 'settings.opt.bestHint' },
          { value: 'saver', label: 'settings.opt.saver', hint: 'settings.opt.saverHint' },
        ],
      },
    ],
  },
  {
    id: 'sound',
    label: 'settings.sec.sound',
    icon: 'music',
    items: [
      {
        kind: 'choice',
        key: 'soundProfile',
        label: 'settings.sound.profile',
        hint: 'settings.sound.profileHint',
        icon: 'volume',
        options: [
          { value: 'cinema', label: 'settings.sound.cinema', hint: 'settings.sound.cinemaHint' },
          { value: 'clear', label: 'settings.sound.clear', hint: 'settings.sound.clearHint' },
          { value: 'night', label: 'settings.sound.night', hint: 'settings.sound.nightHint' },
        ],
      },
      { kind: 'slider', key: 'narrationVolume', label: 'settings.sound.voice', icon: 'mic', min: 0, max: 1, step: 0.1 },
      { kind: 'toggle', key: 'music', label: 'settings.sound.music', hint: 'settings.sound.musicHint', icon: 'music' },
      { kind: 'slider', key: 'musicVolume', label: 'settings.sound.musicVolume', icon: 'music', min: 0, max: 1, step: 0.05 },
      { kind: 'toggle', key: 'sfx', label: 'settings.sound.sfx', hint: 'settings.sound.sfxHint', icon: 'sparkle' },
      { kind: 'slider', key: 'sfxVolume', label: 'settings.sound.sfxVolume', icon: 'sparkle', min: 0, max: 1, step: 0.1 },
      { kind: 'toggle', key: 'focusSounds', label: 'settings.sound.focus', hint: 'settings.sound.focusHint', icon: 'remote' },
      {
        kind: 'choice',
        key: 'narrator',
        label: 'settings.sound.narrator',
        hint: 'settings.sound.narratorHint',
        icon: 'user',
        options: [
          { value: 'Ruth', label: 'Ruth · US' },
          { value: 'Joanna', label: 'Joanna · US' },
          { value: 'Matthew', label: 'Matthew · US' },
          { value: 'Stephen', label: 'Stephen · US' },
          { value: 'Amy', label: 'Amy · UK' },
          { value: 'Brian', label: 'Brian · UK' },
          { value: 'Olivia', label: 'Olivia · Australia' },
          { value: 'Kajal', label: 'Kajal · India' },
        ],
      },
    ],
  },
  {
    id: 'captions',
    label: 'settings.sec.captions',
    icon: 'subtitles',
    items: [
      { kind: 'preview', id: 'captions' },
      { kind: 'toggle', key: 'captions', label: 'settings.cap.show', hint: 'settings.cap.showHint', icon: 'subtitles' },
      {
        kind: 'choice',
        key: 'captionSize',
        label: 'settings.cap.size',
        icon: 'text',
        options: [
          { value: 's', label: 'settings.opt.small' },
          { value: 'm', label: 'settings.opt.medium' },
          { value: 'l', label: 'settings.opt.large' },
          { value: 'xl', label: 'settings.opt.xlarge' },
        ],
      },
      {
        kind: 'choice',
        key: 'captionFont',
        label: 'settings.cap.font',
        icon: 'text',
        options: [
          { value: 'story', label: 'settings.opt.fontStory' },
          { value: 'rounded', label: 'settings.opt.fontRounded' },
          { value: 'readable', label: 'settings.opt.fontReadable', hint: 'settings.opt.fontReadableHint' },
        ],
      },
      {
        kind: 'choice',
        key: 'captionColor',
        label: 'settings.cap.color',
        icon: 'palette',
        options: [
          { value: 'parchment', label: 'settings.opt.warmWhite' },
          { value: 'white', label: 'settings.opt.white' },
          { value: 'yellow', label: 'settings.opt.yellow' },
          { value: 'cyan', label: 'settings.opt.cyan' },
        ],
      },
      {
        kind: 'choice',
        key: 'captionBackground',
        label: 'settings.cap.background',
        icon: 'quality',
        options: [
          { value: 'shadow', label: 'settings.opt.shadow' },
          { value: 'box', label: 'settings.opt.boxBg' },
          { value: 'none', label: 'settings.opt.none' },
        ],
      },
      {
        kind: 'choice',
        key: 'captionPosition',
        label: 'settings.cap.position',
        icon: 'sliders',
        options: [
          { value: 'bottom', label: 'settings.opt.bottom' },
          { value: 'top', label: 'settings.opt.top' },
        ],
      },
    ],
  },
  {
    id: 'display',
    label: 'settings.sec.display',
    icon: 'sun',
    items: [
      {
        kind: 'choice',
        key: 'skyStyle',
        label: 'settings.disp.sky',
        hint: 'settings.disp.skyHint',
        icon: 'sun',
        options: [
          { value: 'cinematic', label: 'settings.opt.cinematic', hint: 'settings.opt.cinematicHint' },
          { value: 'illustrated', label: 'settings.opt.illustrated', hint: 'settings.opt.illustratedHint' },
          { value: 'calm', label: 'settings.opt.calm', hint: 'settings.opt.calmHint' },
        ],
      },
      {
        kind: 'choice',
        key: 'skyMode',
        label: 'settings.disp.time',
        hint: 'settings.disp.timeHint',
        icon: 'clock',
        options: [
          { value: 'auto', label: 'settings.opt.followSun', hint: 'settings.opt.followSunHint' },
          { value: 'sunrise', label: 'settings.opt.sunrise' },
          { value: 'day', label: 'settings.opt.day' },
          { value: 'sunset', label: 'settings.opt.sunset' },
          { value: 'night', label: 'settings.opt.night' },
        ],
      },
      {
        kind: 'choice',
        key: 'comfortDim',
        label: 'settings.disp.comfort',
        hint: 'settings.disp.comfortHint',
        icon: 'eye',
        options: [
          { value: 'auto', label: 'settings.opt.auto' },
          { value: 'strong', label: 'settings.opt.strong' },
          { value: 'off', label: 'common.off' },
        ],
      },
      { kind: 'toggle', key: 'kenBurns', label: 'settings.disp.motion', hint: 'settings.disp.motionHint', icon: 'sparkle' },
      {
        kind: 'choice',
        key: 'pageTransition',
        label: 'settings.disp.transition',
        icon: 'book',
        options: [
          { value: 'fade', label: 'settings.opt.fade' },
          { value: 'dissolve', label: 'settings.opt.dissolve' },
          { value: 'slide', label: 'settings.opt.slide' },
        ],
      },
      {
        kind: 'choice',
        key: 'ambientAfterMin',
        label: 'settings.disp.ambient',
        hint: 'settings.disp.ambientHint',
        icon: 'moon',
        options: [
          { value: 0, label: 'settings.opt.never' },
          { value: 5, label: 'settings.opt.min5' },
          { value: 10, label: 'settings.opt.min10' },
          { value: 20, label: 'settings.opt.min20' },
        ],
      },
      { kind: 'toggle', key: 'showClock', label: 'settings.disp.clock', icon: 'clock' },
      {
        kind: 'choice',
        key: 'accent',
        label: 'settings.disp.accent',
        icon: 'palette',
        options: [
          { value: 'gold', label: 'settings.opt.gold' },
          { value: 'rose', label: 'settings.opt.rose' },
          { value: 'aqua', label: 'settings.opt.aqua' },
          { value: 'lilac', label: 'settings.opt.lilac' },
        ],
      },
    ],
  },
  {
    id: 'parental',
    label: 'settings.sec.parental',
    icon: 'shield',
    pin: true,
    items: [
      {
        kind: 'page',
        id: 'pin',
        label: 'settings.par.pinPage',
        hint: 'settings.par.pinPageHint',
        icon: 'lock',
        items: [
          { kind: 'action', id: 'pin', label: 'settings.par.setPin', hint: 'settings.par.setPinHint', icon: 'key' },
          { kind: 'toggle', key: 'pinForSettings', label: 'settings.par.pinSettings', icon: 'settings' },
          { kind: 'toggle', key: 'pinForCreate', label: 'settings.par.pinCreate', icon: 'wand' },
          { kind: 'action', id: 'removePin', label: 'settings.par.removePin', icon: 'trash', danger: true },
        ],
      },
      {
        kind: 'choice',
        key: 'ageBand',
        label: 'parents.age',
        hint: 'parents.ageNote',
        icon: 'family',
        options: [
          { value: 'little', label: 'parents.age.little' },
          { value: 'kid', label: 'parents.age.kid' },
          { value: 'big-kid', label: 'parents.age.big' },
        ],
      },
      {
        kind: 'choice',
        key: 'scaryLevel',
        label: 'settings.par.scary',
        hint: 'settings.par.scaryHint',
        icon: 'moon',
        options: [
          { value: 'none', label: 'settings.opt.scaryNone', hint: 'settings.opt.scaryNoneHint' },
          { value: 'little', label: 'settings.opt.scaryLittle', hint: 'settings.opt.scaryLittleHint' },
          { value: 'spooky', label: 'settings.opt.scarySpooky', hint: 'settings.opt.scarySpookyHint' },
        ],
      },
      {
        kind: 'multi',
        key: 'avoidTopics',
        label: 'settings.par.avoid',
        hint: 'settings.par.avoidHint',
        icon: 'eye',
        options: [
          { value: 'monsters', label: 'settings.topic.monsters' },
          { value: 'darkness', label: 'settings.topic.darkness' },
          { value: 'storms', label: 'settings.topic.storms' },
          { value: 'lost', label: 'settings.topic.lost' },
          { value: 'animalsHurt', label: 'settings.topic.animalsHurt' },
          { value: 'spiders', label: 'settings.topic.spiders' },
          { value: 'deepWater', label: 'settings.topic.deepWater' },
          { value: 'doctors', label: 'settings.topic.doctors' },
          { value: 'loudNoises', label: 'settings.topic.loudNoises' },
        ],
      },
      {
        kind: 'choice',
        key: 'safetyLevel',
        label: 'settings.par.safety',
        hint: 'settings.par.safetyHint',
        icon: 'shield',
        options: [
          { value: 'standard', label: 'settings.opt.standard', hint: 'settings.opt.standardSafetyHint' },
          { value: 'strict', label: 'settings.opt.strict', hint: 'settings.opt.strictSafetyHint' },
        ],
      },
      {
        kind: 'choice',
        key: 'dailyLimitMin',
        label: 'parents.daily',
        hint: 'parents.dailyNote',
        icon: 'timer',
        options: [
          { value: 0, label: 'parents.noLimit' },
          { value: 20, label: 'settings.opt.min20' },
          { value: 30, label: 'settings.opt.min30' },
          { value: 45, label: 'settings.opt.min45' },
          { value: 60, label: 'settings.opt.min60' },
          { value: 90, label: 'settings.opt.min90' },
        ],
      },
      {
        kind: 'page',
        id: 'bedtime',
        label: 'settings.par.bedtime',
        hint: 'settings.par.bedtimeHint',
        icon: 'moon',
        items: [
          { kind: 'toggle', key: 'bedtimeMode', label: 'parents.bedtime', hint: 'parents.bedtimeNote', icon: 'moon' },
          {
            kind: 'choice',
            key: 'sleepTimerMin',
            label: 'settings.par.sleepDefault',
            icon: 'timer',
            options: [
              { value: 0, label: 'parents.noTimer' },
              { value: 10, label: 'settings.opt.min10' },
              { value: 20, label: 'settings.opt.min20' },
              { value: 30, label: 'settings.opt.min30' },
              { value: 45, label: 'settings.opt.min45' },
            ],
          },
          { kind: 'toggle', key: 'bedtimeLock', label: 'settings.par.lock', hint: 'settings.par.lockHint', icon: 'lock' },
          { kind: 'choice', key: 'bedtimeFrom', label: 'settings.par.lockFrom', icon: 'moon', options: TIMES },
          { kind: 'choice', key: 'bedtimeTo', label: 'settings.par.lockTo', icon: 'sun', options: MORNINGS },
        ],
      },
      {
        kind: 'choice',
        key: 'playersJoin',
        label: 'settings.par.join',
        hint: 'settings.par.joinHint',
        icon: 'phone',
        options: [
          { value: 'open', label: 'settings.opt.joinOpen', hint: 'settings.opt.joinOpenHint' },
          { value: 'approve', label: 'settings.opt.joinApprove', hint: 'settings.opt.joinApproveHint' },
          { value: 'off', label: 'settings.opt.joinOff', hint: 'settings.opt.joinOffHint' },
        ],
      },
      {
        kind: 'choice',
        key: 'maxPlayers',
        label: 'settings.par.maxPlayers',
        icon: 'family',
        options: [2, 3, 4, 5, 6, 8].map((n) => ({ value: n, label: String(n) })),
      },
    ],
  },
  {
    id: 'create',
    label: 'settings.sec.create',
    icon: 'wand',
    items: [
      {
        kind: 'choice',
        key: 'storyLength',
        label: 'settings.cr.length',
        icon: 'book',
        options: [
          { value: 'short', label: 'settings.opt.lenShort', hint: 'settings.opt.lenShortHint' },
          { value: 'medium', label: 'settings.opt.lenMedium', hint: 'settings.opt.lenMediumHint' },
          { value: 'long', label: 'settings.opt.lenLong', hint: 'settings.opt.lenLongHint' },
        ],
      },
      {
        kind: 'choice',
        key: 'defaultMood',
        label: 'settings.cr.mood',
        icon: 'heart',
        options: [
          { value: 'cozy', label: 'mood.cozy' },
          { value: 'adventure', label: 'mood.adventure' },
          { value: 'silly', label: 'mood.silly' },
          { value: 'curious', label: 'mood.curious' },
        ],
      },
      {
        kind: 'choice',
        key: 'artStyle',
        label: 'settings.cr.art',
        hint: 'settings.cr.artHint',
        icon: 'palette',
        options: [
          { value: 'storybook', label: 'settings.art.storybook' },
          { value: 'watercolor', label: 'settings.art.watercolor' },
          { value: 'papercut', label: 'settings.art.papercut' },
          { value: 'pastel', label: 'settings.art.pastel' },
          { value: 'clay', label: 'settings.art.clay' },
          { value: 'comic', label: 'settings.art.comic' },
        ],
      },
      { kind: 'toggle', key: 'useFamilyNames', label: 'settings.cr.names', hint: 'settings.cr.namesHint', icon: 'family' },
      {
        kind: 'choice',
        key: 'choiceMoments',
        label: 'settings.cr.choices',
        hint: 'settings.cr.choicesHint',
        icon: 'sparkle',
        options: [
          { value: 0, label: 'settings.opt.none' },
          { value: 1, label: 'settings.opt.one' },
          { value: 2, label: 'settings.opt.two' },
        ],
      },
      { kind: 'toggle', key: 'learningFacts', label: 'settings.cr.facts', hint: 'settings.cr.factsHint', icon: 'bolt' },
      {
        kind: 'choice',
        key: 'lessonFocus',
        label: 'settings.cr.lesson',
        hint: 'settings.cr.lessonHint',
        icon: 'star',
        options: [
          { value: 'none', label: 'settings.lesson.none' },
          { value: 'kindness', label: 'settings.lesson.kindness' },
          { value: 'courage', label: 'settings.lesson.courage' },
          { value: 'sharing', label: 'settings.lesson.sharing' },
          { value: 'patience', label: 'settings.lesson.patience' },
          { value: 'honesty', label: 'settings.lesson.honesty' },
          { value: 'curiosity', label: 'settings.lesson.curiosity' },
        ],
      },
      { kind: 'toggle', key: 'rhyming', label: 'settings.cr.rhyme', hint: 'settings.cr.rhymeHint', icon: 'music' },
    ],
  },
  {
    id: 'privacy',
    label: 'settings.sec.privacy',
    icon: 'lock',
    pin: true,
    items: [
      {
        kind: 'choice',
        key: 'keepDrawings',
        label: 'parents.drawings',
        hint: 'parents.drawingsNote',
        icon: 'brush',
        options: [
          { value: 0, label: 'parents.delete24' },
          { value: 1, label: 'parents.keep' },
        ],
      },
      { kind: 'toggle', key: 'familyMemory', label: 'settings.priv.memory', hint: 'settings.priv.memoryHint', icon: 'heart' },
      { kind: 'action', id: 'clearMemory', label: 'settings.priv.clearMemory', icon: 'refresh' },
      { kind: 'toggle', key: 'voiceIdeas', label: 'settings.priv.voice', hint: 'settings.priv.voiceHint', icon: 'mic' },
      { kind: 'toggle', key: 'analytics', label: 'settings.priv.analytics', hint: 'settings.priv.analyticsHint', icon: 'data' },
      { kind: 'toggle', key: 'crashReports', label: 'settings.priv.crash', hint: 'settings.priv.crashHint', icon: 'info' },
      { kind: 'action', id: 'downloadData', label: 'settings.priv.download', hint: 'settings.priv.downloadHint', icon: 'download' },
      { kind: 'action', id: 'deleteHistory', label: 'settings.priv.deleteHistory', hint: 'settings.priv.deleteHistoryHint', icon: 'trash', danger: true },
    ],
  },
  {
    id: 'notifications',
    label: 'settings.sec.notifications',
    icon: 'bell',
    items: [
      { kind: 'toggle', key: 'storyReadyAlert', label: 'settings.not.ready', hint: 'settings.not.readyHint', icon: 'sparkle' },
      { kind: 'toggle', key: 'bedtimeReminder', label: 'settings.not.bedtime', hint: 'settings.not.bedtimeHint', icon: 'moon' },
      { kind: 'choice', key: 'reminderTime', label: 'settings.not.time', icon: 'clock', options: TIMES },
    ],
  },
  {
    id: 'accessibility',
    label: 'settings.sec.accessibility',
    icon: 'eye',
    items: [
      { kind: 'toggle', key: 'largeText', label: 'settings.acc.large', hint: 'settings.acc.largeHint', icon: 'text' },
      { kind: 'toggle', key: 'highContrast', label: 'settings.acc.contrast', hint: 'settings.acc.contrastHint', icon: 'eye' },
      { kind: 'toggle', key: 'reduceMotion', label: 'settings.acc.motion', hint: 'settings.acc.motionHint', icon: 'sliders' },
      {
        kind: 'choice',
        key: 'focusStyle',
        label: 'settings.acc.focus',
        icon: 'star',
        options: [
          { value: 'glow', label: 'settings.opt.glowFocus' },
          { value: 'outline', label: 'settings.opt.outline' },
        ],
      },
      { kind: 'toggle', key: 'describePictures', label: 'settings.acc.describe', hint: 'settings.acc.describeHint', icon: 'volume' },
      { kind: 'toggle', key: 'screenReaderHints', label: 'settings.acc.reader', hint: 'settings.acc.readerHint', icon: 'info' },
      {
        kind: 'choice',
        key: 'holdToRepeat',
        label: 'settings.acc.repeat',
        icon: 'remote',
        options: [
          { value: 'normal', label: 'settings.opt.normal' },
          { value: 'slow', label: 'settings.opt.slow' },
        ],
      },
    ],
  },
  {
    id: 'remote',
    label: 'settings.sec.remote',
    icon: 'remote',
    items: [
      { kind: 'toggle', key: 'alexaVoice', label: 'settings.rem.alexa', hint: 'settings.rem.alexaHint', icon: 'mic' },
      { kind: 'toggle', key: 'exitConfirm', label: 'settings.rem.exit', hint: 'settings.rem.exitHint', icon: 'logout' },
      { kind: 'action', id: 'remoteGuide', label: 'settings.rem.guide', hint: 'settings.rem.guideHint', icon: 'remote' },
    ],
  },
  {
    id: 'about',
    label: 'settings.sec.about',
    icon: 'info',
    items: [
      { kind: 'info', id: 'version', label: 'settings.about.version', icon: 'info' },
      { kind: 'action', id: 'contact', label: 'settings.about.contact', hint: 'settings.about.contactHint', icon: 'heart' },
      { kind: 'action', id: 'terms', label: 'settings.about.terms', icon: 'book' },
      { kind: 'action', id: 'privacy', label: 'settings.about.privacy', icon: 'lock' },
      { kind: 'action', id: 'children', label: 'settings.about.children', icon: 'family' },
      { kind: 'action', id: 'licenses', label: 'settings.about.licenses', icon: 'data' },
      { kind: 'action', id: 'credits', label: 'settings.about.credits', icon: 'star' },
      { kind: 'action', id: 'replayTour', label: 'settings.about.tour', icon: 'sparkle' },
      { kind: 'action', id: 'resetSettings', label: 'settings.about.reset', hint: 'settings.about.resetHint', icon: 'refresh', danger: true },
    ],
  },
];

export { pct };

/** Counts every adjustable option (nested pages included). */
export function optionCount(items: Item[] = SECTIONS.flatMap((s) => s.items)): number {
  return items.reduce((n, it) => n + (it.kind === 'page' ? optionCount(it.items) : it.kind === 'preview' || it.kind === 'info' ? 0 : 1), 0);
}
