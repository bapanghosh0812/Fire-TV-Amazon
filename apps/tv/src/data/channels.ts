import type { StringKey } from '../i18n';
import type { IconName } from '../components/Icon';

// Music channels and sleep sounds, all composed and synthesized for Storyloom
// by tools/audio/channels.py (no samples, no third-party audio).

export interface Channel {
  id: string;
  kind: 'music' | 'sleep';
  title: StringKey;
  blurb: StringKey;
  icon: IconName;
  palette: string[];
  tracks: number[]; // bundled audio, played in order and looped
}

export const MUSIC: Channel[] = [
  {
    id: 'lullaby',
    kind: 'music',
    title: 'channel.lullaby.title',
    blurb: 'channel.lullaby.blurb',
    icon: 'moon',
    palette: ['#10123A', '#4B4E9E', '#FFE6A8', '#23265E', '#0A0B26'],
    tracks: [require('../../assets/audio/channels/lullaby-1.mp3'), require('../../assets/audio/channels/lullaby-2.mp3'), require('../../assets/audio/channels/lullaby-3.mp3')],
  },
  {
    id: 'piano',
    kind: 'music',
    title: 'channel.piano.title',
    blurb: 'channel.piano.blurb',
    icon: 'music',
    palette: ['#1A1330', '#7A5C9E', '#F5D9B8', '#3A2A57', '#120C22'],
    tracks: [require('../../assets/audio/channels/piano-1.mp3'), require('../../assets/audio/channels/piano-2.mp3'), require('../../assets/audio/channels/piano-3.mp3')],
  },
  {
    id: 'dreamy',
    kind: 'music',
    title: 'channel.dreamy.title',
    blurb: 'channel.dreamy.blurb',
    icon: 'sparkle',
    palette: ['#071A2E', '#2E6FA8', '#BDEBFF', '#153E63', '#051523'],
    tracks: [require('../../assets/audio/channels/dreamy-1.mp3'), require('../../assets/audio/channels/dreamy-2.mp3')],
  },
  {
    id: 'adventure',
    kind: 'music',
    title: 'channel.adventure.title',
    blurb: 'channel.adventure.blurb',
    icon: 'globe',
    palette: ['#102A3A', '#2F8F83', '#FFD27A', '#1C4E55', '#0A1C26'],
    tracks: [require('../../assets/audio/channels/adventure-1.mp3'), require('../../assets/audio/channels/adventure-2.mp3')],
  },
  {
    id: 'happy',
    kind: 'music',
    title: 'channel.happy.title',
    blurb: 'channel.happy.blurb',
    icon: 'heart',
    palette: ['#3A1030', '#E5566F', '#FFE08A', '#6A1E45', '#240A1E'],
    tracks: [require('../../assets/audio/channels/happy-1.mp3'), require('../../assets/audio/channels/happy-2.mp3')],
  },
];

export const SLEEP: Channel[] = [
  { id: 'rain', kind: 'sleep', title: 'sleep.rain.title', blurb: 'sleep.rain.blurb', icon: 'rain', palette: ['#0B1626', '#35557A', '#A9C8E8', '#1B2E47', '#070F1A'], tracks: [require('../../assets/audio/sleep/rain.mp3')] },
  { id: 'ocean', kind: 'sleep', title: 'sleep.ocean.title', blurb: 'sleep.ocean.blurb', icon: 'wave', palette: ['#06202E', '#1D6F8C', '#9FE3F2', '#0F3D52', '#04141D'], tracks: [require('../../assets/audio/sleep/ocean.mp3')] },
  { id: 'forest', kind: 'sleep', title: 'sleep.forest.title', blurb: 'sleep.forest.blurb', icon: 'tree', palette: ['#07170F', '#2B5A3C', '#C9F2A8', '#15331F', '#040D08'], tracks: [require('../../assets/audio/sleep/forest.mp3')] },
  { id: 'stream', kind: 'sleep', title: 'sleep.stream.title', blurb: 'sleep.stream.blurb', icon: 'drop', palette: ['#082026', '#2C7C84', '#B8F5EE', '#134A50', '#051518'], tracks: [require('../../assets/audio/sleep/stream.mp3')] },
  { id: 'fire', kind: 'sleep', title: 'sleep.fire.title', blurb: 'sleep.fire.blurb', icon: 'flame', palette: ['#1E0B06', '#8C3A1C', '#FFC37A', '#4A1D10', '#140704'], tracks: [require('../../assets/audio/sleep/fire.mp3')] },
  { id: 'wind', kind: 'sleep', title: 'sleep.wind.title', blurb: 'sleep.wind.blurb', icon: 'wind', palette: ['#141A26', '#56647E', '#D6E0F0', '#2A3346', '#0C1018'], tracks: [require('../../assets/audio/sleep/wind.mp3')] },
  { id: 'hush', kind: 'sleep', title: 'sleep.hush.title', blurb: 'sleep.hush.blurb', icon: 'moon', palette: ['#0E0A1E', '#3E3470', '#D8CCFF', '#211A40', '#080612'], tracks: [require('../../assets/audio/sleep/hush.mp3')] },
];

const ALL = new Map([...MUSIC, ...SLEEP].map((c) => [c.id, c]));
export const channelById = (id: string) => ALL.get(id);
