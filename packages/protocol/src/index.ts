// Shared contracts between the TV app, the phone companion and the cloud.
// Every realtime message is a RoomEvent; every stored story is a Story.

export type AgeBand = 'little' | 'kid' | 'big-kid'; // 3-5, 6-8, 9-11
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
  | { action: 'settings'; mood?: Mood; length?: StoryLength }
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
  storyId?: string;
}

export const THREAD_COLORS = ['#FF7A6B', '#3FD0C9', '#B69CFF', '#FFB84D', '#7BD88F', '#FF8FC7'] as const;
