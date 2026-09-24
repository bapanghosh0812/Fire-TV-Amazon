// Shared contracts between the TV app, the phone companion and the cloud.
// Every realtime message is a RoomEvent; every stored story is a Story.

export type AgeBand = 'little' | 'kid' | 'big-kid'; // 3-5, 6-8, 9-11

// ---- Languages: stories are written and narrated natively in each one ----
export interface LanguageInfo {
  code: string; // BCP-47, also used for speech recognition on phones
  native: string; // how the family sees it
  english: string; // for the story writer and docs
  voice: string; // Amazon Polly voice
  rtl?: boolean;
  wordHighlight: boolean; // false for scripts without spaces: highlight by phrase
}

export const LANGUAGES: LanguageInfo[] = [
  { code: 'en-US', native: 'English (US)', english: 'American English', voice: 'Ruth', wordHighlight: true },
  { code: 'en-GB', native: 'English (UK)', english: 'British English', voice: 'Amy', wordHighlight: true },
  { code: 'en-IN', native: 'English (India)', english: 'Indian English', voice: 'Kajal', wordHighlight: true },
  { code: 'hi-IN', native: 'हिन्दी', english: 'Hindi', voice: 'Kajal', wordHighlight: true },
  { code: 'es-ES', native: 'Español', english: 'Spanish (Spain)', voice: 'Lucia', wordHighlight: true },
  { code: 'es-MX', native: 'Español (México)', english: 'Mexican Spanish', voice: 'Mia', wordHighlight: true },
  { code: 'fr-FR', native: 'Français', english: 'French', voice: 'Lea', wordHighlight: true },
  { code: 'de-DE', native: 'Deutsch', english: 'German', voice: 'Vicki', wordHighlight: true },
  { code: 'it-IT', native: 'Italiano', english: 'Italian', voice: 'Bianca', wordHighlight: true },
  { code: 'pt-BR', native: 'Português (Brasil)', english: 'Brazilian Portuguese', voice: 'Camila', wordHighlight: true },
  { code: 'ja-JP', native: '日本語', english: 'Japanese', voice: 'Kazuha', wordHighlight: false },
  { code: 'ko-KR', native: '한국어', english: 'Korean', voice: 'Seoyeon', wordHighlight: true },
  { code: 'ar-AE', native: 'العربية', english: 'Arabic', voice: 'Hala', rtl: true, wordHighlight: true },
  { code: 'cmn-CN', native: '中文', english: 'Mandarin Chinese (Simplified)', voice: 'Zhiyu', wordHighlight: false },
];

export const DEFAULT_LANGUAGE = 'en-US';

export function languageInfo(code?: string): LanguageInfo {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
}

/** Best match for a device locale such as "hi-IN", "es-AR" or "zh-Hans-CN". */
export function matchLanguage(locale?: string): string {
  if (!locale) return DEFAULT_LANGUAGE;
  const exact = LANGUAGES.find((l) => l.code.toLowerCase() === locale.toLowerCase());
  if (exact) return exact.code;
  const base = locale.split(/[-_]/)[0].toLowerCase();
  if (base === 'zh') return 'cmn-CN';
  if (base === 'es') return /mx|us|419|ar|co|cl|pe/i.test(locale) ? 'es-MX' : 'es-ES';
  return LANGUAGES.find((l) => l.code.split('-')[0] === base)?.code ?? DEFAULT_LANGUAGE;
}
export type Mood = 'cozy' | 'adventure' | 'silly' | 'curious';
export type StoryLength = 'short' | 'medium';

export type ThreadKind = 'hero' | 'world' | 'spark';

export interface Player {
  id: string;
  name: string;
  color: string; // thread colour shown on TV
  avatar: string; // one of the built-in avatar keys
  isTv?: boolean;
}

export interface HeroThread {
  kind: 'hero';
  by: string; // player id
  name: string;
  description: string;
  drawingUrl?: string; // original photo of the child's drawing
  portraitUrl?: string; // illustrated version
  cutoutUrl?: string; // transparent PNG used in animations
  presetId?: string;
}

export interface TextThread {
  kind: 'world' | 'spark';
  by: string;
  text: string;
  presetId?: string;
}

export type Thread = HeroThread | TextThread;

export interface WordMark {
  t: number; // ms from start of page audio
  s: number; // start char index in page text
  e: number; // end char index (exclusive)
}

export interface StoryPage {
  index: number;
  text: string;
  imageUrl?: string;
  audioUrl?: string;
  marks?: WordMark[];
  durationMs?: number;
  branch?: 'a' | 'b'; // pages after the choice belong to a branch
}

export interface StoryChoice {
  afterPage: number;
  prompt: string;
  options: [ChoiceOption, ChoiceOption];
}

export interface ChoiceOption {
  id: 'a' | 'b';
  label: string;
  imageUrl?: string;
}

export interface Story {
  id: string;
  title: string;
  summary: string;
  coverUrl?: string;
  palette?: string[]; // used for generated cover art while images load
  mood: Mood;
  ageBand: AgeBand;
  hero: HeroThread;
  world: TextThread;
  spark: TextThread;
  pages: StoryPage[];
  choice?: StoryChoice;
  chosen?: 'a' | 'b';
  createdAt: string;
  contributors: Player[];
  narrator: string;
  language?: string;
  status: 'weaving' | 'ready' | 'failed';
}

export type WeaveStage = 'plan' | 'hero' | 'write' | 'paint' | 'voice' | 'safety' | 'done';

// ---- Realtime events (room channel) ----
export type RoomEvent =
  | { type: 'room.state'; room: RoomState }
  | { type: 'player.joined'; player: Player }
  | { type: 'player.left'; playerId: string }
  | { type: 'thread.set'; thread: Thread }
  | { type: 'thread.clear'; kind: ThreadKind }
  | { type: 'hero.processing'; by: string; drawingUrl: string }
  | { type: 'weave.started'; storyId: string }
  | { type: 'weave.progress'; storyId: string; stage: WeaveStage; message: string; pct: number }
  | { type: 'page.ready'; storyId: string; page: StoryPage }
  | { type: 'choice.open'; storyId: string; choice: StoryChoice; closesAt: number }
  | { type: 'vote.cast'; storyId: string; playerId: string; option: 'a' | 'b' }
  | { type: 'choice.closed'; storyId: string; winner: 'a' | 'b'; tally: Record<'a' | 'b', number> }
  | { type: 'story.ready'; story: Story }
  | { type: 'story.failed'; storyId: string; reason: string }
  | { type: 'remote.key'; key: 'up' | 'down' | 'left' | 'right' | 'select' | 'back' | 'playpause' }
  | { type: 'playback'; storyId: string; page: number; total: number }
  | { type: 'room.closed' }
  | { type: 'error'; message: string };

export type RemoteKeyName = 'up' | 'down' | 'left' | 'right' | 'select' | 'back' | 'playpause';

// ---- Messages a client (TV or phone) sends over the socket ----
export type ClientAction =
  | { action: 'thread.set'; thread: TextThread | Omit<HeroThread, 'by'> }
  | { action: 'thread.clear'; kind: ThreadKind }
  | { action: 'settings'; mood?: Mood; length?: StoryLength; language?: string }
  | { action: 'vote'; storyId: string; option: 'a' | 'b' }
  | { action: 'remote'; key: RemoteKeyName }
  | { action: 'sync' }
  // TV-only: the TV is the source of truth for playback and voting.
  | { action: 'choice.open'; storyId: string; closesAt: number }
  | { action: 'choice.decided'; storyId: string; winner: 'a' | 'b' }
  | { action: 'playback'; storyId: string; page: number; total: number }
  | { action: 'ping' };

export interface JoinResponse {
  roomId: string;
  code: string;
  player: Player;
  token: string; // short-lived, scoped to this room
  socketUrl: string;
  state: RoomState;
}

export interface UploadTicket {
  url: string; // presigned S3 POST endpoint
  fields: Record<string, string>; // form fields that must accompany the file
  key: string;
  maxBytes: number;
}

export interface HouseholdResponse {
  householdId: string;
  deviceToken: string;
}

export interface CreateRoomResponse {
  roomId: string;
  code: string;
  joinUrl: string;
  token: string;
  socketUrl: string;
  state: RoomState;
}

export interface StorySummary {
  id: string;
  title: string;
  summary: string;
  coverUrl?: string;
  palette?: string[];
  mood: Mood;
  createdAt: string;
  status: Story['status'];
  heroName: string;
  contributors: Player[];
}

export interface RoomState {
  roomId: string;
  code: string;
  players: Player[];
  threads: Partial<Record<ThreadKind, Thread>>;
  mood: Mood;
  length: StoryLength;
  ageBand: AgeBand;
  language?: string;
  storyId?: string;
}

export const THREAD_COLORS = ['#FF7A6B', '#3FD0C9', '#B69CFF', '#FFB84D', '#7BD88F', '#FF8FC7'] as const;
