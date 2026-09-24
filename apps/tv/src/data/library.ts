import type { Story } from '@storyloom/protocol';

// Seed bookshelf. These are original stories written for Storyloom; they also
// power the offline demo mode when the cloud is unreachable.

const family = [
  { id: 'p-mia', name: 'Mia', color: '#FF7A6B', avatar: 'fox' },
  { id: 'p-dad', name: 'Dad', color: '#3FD0C9', avatar: 'owl' },
  { id: 'p-mom', name: 'Mom', color: '#B69CFF', avatar: 'deer' },
];

export const LIBRARY: Story[] = [
  {
    id: 'luna-lighthouse',
    title: 'Luna and the Lighthouse on the Moon',
    summary: 'When the moon’s lighthouse goes dark, a small purple dragon has to find a big light.',
    palette: ['#141045', '#5B3E8F', '#FFD98A', '#2A2163', '#120D33'],
    mood: 'cozy',
    ageBand: 'kid',
    hero: { kind: 'hero', by: 'p-mia', name: 'Luna', description: 'a small purple dragon with a crooked golden crown' },
    world: { kind: 'world', by: 'p-dad', text: 'a lighthouse on the moon' },
    spark: { kind: 'spark', by: 'p-mom', text: 'the light goes out' },
    narrator: 'Ruth',
    status: 'ready',
    createdAt: '2026-09-20T19:30:00Z',
    contributors: family,
    pages: [
      { index: 0, text: 'High above the sleepy Earth, on the quiet silver moon, stood a tall lighthouse with a candy-striped roof. Every night its golden light swept across the sky, so that lost stars could find their way home.' },
      { index: 1, text: 'Luna was a small purple dragon with a crooked crown and a very big heart. She lived at the bottom of the lighthouse, in a round room full of pillows and moon-dust.' },
      { index: 2, text: 'One night, the golden light flickered… and went out. Far away, a baby star began to cry. “I can’t see the way home!” it called into the dark.' },
      { index: 3, text: 'Luna looked up at the cold, dark lamp. She could ask the racing comets for help, or she could try something she had never, ever done before.' },
      { index: 4, branch: 'a', text: 'Luna flapped to the edge of the moon and waved at the comets zooming by. “Please,” she said, “lend me a little of your light.” The comets giggled and swirled around the lighthouse like glowing ribbons.' },
      { index: 5, branch: 'a', text: 'Round and round they flew, until the lamp began to shine again, brighter than ever. The baby star followed the ribbons all the way home. “Thank you, Luna!” it twinkled.' },
      { index: 4, branch: 'b', text: 'Luna climbed all ninety-nine steps to the very top. She took a deep breath, puffed out her cheeks and… whoosh! A tiny, warm flame curled into the lamp.' },
      { index: 5, branch: 'b', text: 'The lighthouse glowed purple and gold, the most beautiful light the moon had ever seen. The baby star followed it all the way home, and Luna learned that small dragons can make big light.' },
      { index: 6, text: 'Back in her pillow room, Luna yawned a sleepy dragon yawn. Outside, the light kept sweeping gently across the sky. Goodnight, Luna. Goodnight, little stars.' },
    ],
    choice: {
      afterPage: 3,
      prompt: 'How should Luna bring the light back?',
      options: [
        { id: 'a', label: 'Ask the comets for help' },
        { id: 'b', label: 'Use her own dragon fire' },
      ],
    },
  },
  {
    id: 'tiger-roar',
    title: 'The Tiger Who Forgot His Roar',
    summary: 'Raja wakes up and his roar comes out as a squeak. The whole jungle helps him find it.',
    palette: ['#2B1B4A', '#E07A4F', '#FFE3A3', '#6B3A2E', '#2A1520'],
    mood: 'silly',
    ageBand: 'little',
    hero: { kind: 'hero', by: 'p-dad', name: 'Raja', description: 'a fluffy orange tiger with enormous paws' },
    world: { kind: 'world', by: 'p-mia', text: 'a jungle full of noisy friends' },
    spark: { kind: 'spark', by: 'p-mom', text: 'a lost roar' },
    narrator: 'Matthew',
    status: 'ready',
    createdAt: '2026-09-18T18:10:00Z',
    contributors: family,
    pages: [
      { index: 0, text: 'Raja the tiger stretched his enormous paws, opened his mouth wide, and ROARED. Except it wasn’t a roar at all. It was a tiny little… squeak.' },
      { index: 1, text: 'The parrot laughed so hard she fell off her branch. “Your roar is missing!” she squawked. “Let’s go and find it!”' },
      { index: 2, text: 'They looked under the banana leaves. They looked behind the waterfall. They even looked inside the sleepy hippo’s ear, which he did not enjoy one bit.' },
      { index: 3, text: 'At last, a little frog hopped up. “I borrowed it,” he whispered. “I wanted to be loud, just once.” Raja smiled. “Then let’s be loud together!”' },
      { index: 4, text: 'So Raja and the frog took a big breath and ROARED and CROAKED at the very same time. The whole jungle cheered, and even the hippo wiggled his ears.' },
    ],
  },
  {
    id: 'pip-cloud-whales',
    title: 'Captain Pip and the Cloud Whales',
    summary: 'A tiny sky-pirate follows a song through the clouds and makes the biggest friends in the sky.',
    palette: ['#0E2A5A', '#5FA8D3', '#FFF1C9', '#2E5E8C', '#0B1E3F'],
    mood: 'adventure',
    ageBand: 'kid',
    hero: { kind: 'hero', by: 'p-mom', name: 'Captain Pip', description: 'a brave mouse in a red captain’s hat' },
    world: { kind: 'world', by: 'p-dad', text: 'a floating city in the clouds' },
    spark: { kind: 'spark', by: 'p-mia', text: 'a mysterious song' },
    narrator: 'Amy',
    status: 'ready',
    createdAt: '2026-09-15T17:45:00Z',
    contributors: family,
    pages: [
      { index: 0, text: 'Captain Pip was the smallest sky-pirate in the floating city, but she had the biggest telescope. Every morning she searched the clouds for adventure.' },
      { index: 1, text: 'One morning she heard a song, low and gentle, like a lullaby hummed by the wind. “Full sails!” cried Pip, and her paper boat lifted into the sky.' },
      { index: 2, text: 'Through the pink clouds she sailed, past the rainbow bridge, until she saw them: whales made of cloud, singing as they swam through the sky.' },
      { index: 3, text: 'The smallest whale was stuck in a knot of thunder. Pip tied a rope to her boat, pulled with all her might, and… pop! The little whale was free.' },
      { index: 4, text: 'That night the cloud whales sang Pip all the way home. And every morning since, when you hear the wind hum, that’s them saying good morning to her.' },
    ],
  },
  {
    id: 'beep-garden',
    title: 'Beep and the Garden of Stars',
    summary: 'A curious little robot learns how stars are born, and plants a constellation of its own.',
    palette: ['#06222B', '#1F6F6B', '#9DFFCF', '#154A45', '#062024'],
    mood: 'curious',
    ageBand: 'big-kid',
    hero: { kind: 'hero', by: 'p-mia', name: 'Beep', description: 'a tiny round robot with a watering-can arm' },
    world: { kind: 'world', by: 'p-mom', text: 'a garden at the edge of space' },
    spark: { kind: 'spark', by: 'p-dad', text: 'a question nobody could answer' },
    narrator: 'Joanna',
    status: 'ready',
    createdAt: '2026-09-12T19:05:00Z',
    contributors: family,
    pages: [
      { index: 0, text: 'Beep was a tiny round robot who looked after a garden at the very edge of space. Every day Beep watered the moon-flowers and asked one big question: where do stars come from?' },
      { index: 1, text: 'The wise old comet explained that stars are born inside giant clouds of gas and dust called nebulas, where gravity pulls everything together until it gets hot enough to shine.' },
      { index: 2, text: 'So Beep gathered stardust from the garden paths, packed it into a glowing seed, and planted it in the softest, darkest patch of sky.' },
      { index: 3, text: 'Beep waited, and watered, and waited some more. Stars take millions of years to grow, the comet reminded, but a gardener must always begin somewhere.' },
      { index: 4, text: 'That night, Beep arranged the brightest seeds into the shape of a watering can. Now, if you look up very carefully, you might just see Beep’s constellation smiling back.' },
    ],
  },
];

export const STARTERS = [
  { id: 'draw', title: 'Draw your own hero', subtitle: 'Snap a drawing with your phone', icon: 'brush' as const, palette: ['#2A0F3D', '#9B4F96', '#FFB3C7', '#4A1E5C', '#1C0A2B'] },
  { id: 'cozy', title: 'Cozy bedtime', subtitle: 'Soft, calm and sleepy', icon: 'moon' as const, palette: ['#0B1030', '#34407A', '#FFE6A8', '#1E2656', '#080B22'] },
  { id: 'adventure', title: 'Big adventure', subtitle: 'Maps, storms and treasure', icon: 'globe' as const, palette: ['#102A3A', '#2F8F83', '#FFD27A', '#1C4E55', '#0A1C26'] },
  { id: 'silly', title: 'Super silly', subtitle: 'Giggles guaranteed', icon: 'sparkle' as const, palette: ['#3A1030', '#E5566F', '#FFE08A', '#6A1E45', '#240A1E'] },
  { id: 'curious', title: 'Learn something', subtitle: 'Space, animals, science', icon: 'bolt' as const, palette: ['#071E2E', '#2E6FA8', '#A8F0FF', '#153E63', '#051523'] },
];

export const HERO_PRESETS = [
  { id: 'fox', name: 'Ember', description: 'a brave little fox with a bright red scarf' },
  { id: 'robot', name: 'Beep', description: 'a tiny round robot who loves flowers' },
  { id: 'dragon', name: 'Luna', description: 'a shy purple dragon with a crooked crown' },
  { id: 'girl', name: 'Asha', description: 'a girl who can talk to birds' },
  { id: 'grandma', name: 'Grandma Rose', description: 'a grandma who secretly pilots a rocket' },
];

export const WORLD_PRESETS = [
  { id: 'moon', text: 'a lighthouse on the moon' },
  { id: 'bakery', text: 'an underwater bakery' },
  { id: 'candy', text: 'a jungle made of candy' },
  { id: 'clouds', text: 'a floating city in the clouds' },
  { id: 'library', text: 'a library where books come alive' },
];

export const SPARK_PRESETS = [
  { id: 'map', text: 'a lost treasure map' },
  { id: 'friend', text: 'a new friend who is very different' },
  { id: 'storm', text: 'a big storm is coming' },
  { id: 'party', text: 'a surprise birthday party' },
  { id: 'door', text: 'a secret door' },
];
