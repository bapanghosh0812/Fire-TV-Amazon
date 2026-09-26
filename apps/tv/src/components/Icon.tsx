import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type IconName =
  | 'play'
  | 'pause'
  | 'sparkle'
  | 'plus'
  | 'book'
  | 'family'
  | 'lock'
  | 'moon'
  | 'left'
  | 'right'
  | 'phone'
  | 'check'
  | 'refresh'
  | 'home'
  | 'brush'
  | 'globe'
  | 'bolt'
  | 'volume'
  | 'wand'
  | 'shield'
  | 'clock'
  | 'trash'
  | 'mic'
  | 'back'
  | 'subtitles'
  | 'settings'
  | 'prev'
  | 'next'
  | 'user'
  | 'bell'
  | 'music'
  | 'star'
  | 'info'
  | 'logout'
  | 'download'
  | 'sliders'
  | 'palette'
  | 'text'
  | 'quality'
  | 'speed'
  | 'close'
  | 'key'
  | 'eye'
  | 'remote'
  | 'heart'
  | 'data'
  | 'sun'
  | 'timer'
  | 'tv'
  | 'rain'
  | 'wave'
  | 'tree'
  | 'drop'
  | 'flame'
  | 'wind'
  | 'headphones';

interface Props {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 28, color = '#fff', strokeWidth = 2 }: Props) {
  const p = { stroke: color, strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {render(name, p, color)}
    </Svg>
  );
}

function render(name: IconName, p: Record<string, unknown>, color: string) {
  switch (name) {
    case 'play':
      return <Path d="M7 4.5v15l12.5-7.5z" fill={color} stroke={color} strokeWidth={1.5} strokeLinejoin="round" />;
    case 'pause':
      return (
        <>
          <Rect x={6} y={4.5} width={4} height={15} rx={1.2} fill={color} />
          <Rect x={14} y={4.5} width={4} height={15} rx={1.2} fill={color} />
        </>
      );
    case 'sparkle':
      return (
        <>
          <Path d="M12 2.5c.6 4.6 2.9 6.9 7.5 7.5-4.6.6-6.9 2.9-7.5 7.5-.6-4.6-2.9-6.9-7.5-7.5 4.6-.6 6.9-2.9 7.5-7.5z" fill={color} />
          <Path d="M19 15.5c.25 1.9 1.1 2.75 3 3-1.9.25-2.75 1.1-3 3-.25-1.9-1.1-2.75-3-3 1.9-.25 2.75-1.1 3-3z" fill={color} />
        </>
      );
    case 'plus':
      return <Path d="M12 5v14M5 12h14" {...p} />;
    case 'book':
      return <Path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15zM4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" {...p} />;
    case 'family':
      return (
        <>
          <Circle cx={8} cy={7} r={3} {...p} />
          <Circle cx={17} cy={9} r={2.3} {...p} />
          <Path d="M2.5 20c0-3.3 2.5-6 5.5-6s5.5 2.7 5.5 6M13.5 16.2c.9-1.1 2.1-1.7 3.5-1.7 2.5 0 4.5 2.2 4.5 5" {...p} />
        </>
      );
    case 'lock':
      return (
        <>
          <Rect x={4.5} y={10.5} width={15} height={10.5} rx={2.5} {...p} />
          <Path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" {...p} />
        </>
      );
    case 'moon':
      return <Path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z" {...p} />;
    case 'left':
      return <Path d="M15 5l-7 7 7 7" {...p} />;
    case 'right':
      return <Path d="M9 5l7 7-7 7" {...p} />;
    case 'phone':
      return (
        <>
          <Rect x={6.5} y={2.5} width={11} height={19} rx={2.5} {...p} />
          <Path d="M10.5 18.5h3" {...p} />
        </>
      );
    case 'check':
      return <Path d="M4.5 12.5l5 5 10-11" {...p} />;
    case 'refresh':
      return <Path d="M20 11a8 8 0 1 0-2.3 5.7M20 4.5V11h-6.5" {...p} />;
    case 'home':
      return <Path d="M3.5 11L12 3.5l8.5 7.5M6 9v11.5h12V9" {...p} />;
    case 'brush':
      return (
        <>
          <Path d="M14.5 4.5l5 5-8.5 8.5-5-5z" {...p} />
          <Path d="M6 13c-2 0-3.5 1.6-3.5 3.5 0 1.5-.5 2.5-1 3 3 .5 7-.5 7-3.5" {...p} />
        </>
      );
    case 'globe':
      return (
        <>
          <Circle cx={12} cy={12} r={9} {...p} />
          <Path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" {...p} />
        </>
      );
    case 'bolt':
      return <Path d="M13 2.5L4.5 13.5H12l-1 8 8.5-11H12z" {...p} />;
    case 'volume':
      return <Path d="M4 9.5h3.5L12.5 5v14l-5-4.5H4zM16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" {...p} />;
    case 'wand':
      return (
        <>
          <Path d="M4 20L15 9M13 7l4 4" {...p} />
          <Path d="M18.5 2.5v3M17 4h3M21 8.5v2M20 9.5h2M9.5 3v2M8.5 4h2" {...p} />
        </>
      );
    case 'shield':
      return <Path d="M12 2.5l8 3v6c0 5-3.4 8.8-8 10-4.6-1.2-8-5-8-10v-6zM8.5 12l2.5 2.5 4.5-5" {...p} />;
    case 'clock':
      return (
        <>
          <Circle cx={12} cy={12} r={9} {...p} />
          <Path d="M12 7v5l3.5 2" {...p} />
        </>
      );
    case 'trash':
      return <Path d="M4 6.5h16M9.5 6.5V4h5v2.5M6.5 6.5l1 14h9l1-14M10 10.5v6M14 10.5v6" {...p} />;
    case 'mic':
      return (
        <>
          <Rect x={8.5} y={2.5} width={7} height={12} rx={3.5} {...p} />
          <Path d="M5 11a7 7 0 0 0 14 0M12 18v3.5" {...p} />
        </>
      );
    case 'back':
      return <Path d="M20 12H5M11 5l-7 7 7 7" {...p} />;
    case 'subtitles':
      return (
        <>
          <Rect x={2.5} y={5} width={19} height={14} rx={2.5} {...p} />
          <Path d="M10.5 10.2a2.4 2.4 0 1 0 0 3.6M17.5 10.2a2.4 2.4 0 1 0 0 3.6" {...p} />
        </>
      );
    case 'settings':
      return (
        <>
          <Circle cx={12} cy={12} r={3} {...p} />
          <Path d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6M18.7 18.7l-1.6-1.6M6.9 6.9L5.3 5.3" {...p} />
          <Circle cx={12} cy={12} r={6.8} {...p} />
        </>
      );
    case 'prev':
      return (
        <>
          <Path d="M18 5v14l-9.5-7z" fill={color} stroke={color} strokeWidth={1.2} strokeLinejoin="round" />
          <Path d="M6 5v14" {...p} strokeWidth={2.6} />
        </>
      );
    case 'next':
      return (
        <>
          <Path d="M6 5v14l9.5-7z" fill={color} stroke={color} strokeWidth={1.2} strokeLinejoin="round" />
          <Path d="M18 5v14" {...p} strokeWidth={2.6} />
        </>
      );
    case 'user':
      return (
        <>
          <Circle cx={12} cy={8} r={4} {...p} />
          <Path d="M4 21c0-4.2 3.6-7 8-7s8 2.8 8 7" {...p} />
        </>
      );
    case 'bell':
      return <Path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0" {...p} />;
    case 'music':
      return (
        <>
          <Path d="M9 18V5.5l11-2V16" {...p} />
          <Circle cx={6.5} cy={18} r={2.5} {...p} />
          <Circle cx={17.5} cy={16} r={2.5} {...p} />
        </>
      );
    case 'star':
      return <Path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" {...p} />;
    case 'info':
      return (
        <>
          <Circle cx={12} cy={12} r={9} {...p} />
          <Path d="M12 11v6M12 7.5v.2" {...p} />
        </>
      );
    case 'logout':
      return <Path d="M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14M10 16.5L5.5 12 10 7.5M5.5 12H15" {...p} />;
    case 'download':
      return <Path d="M12 3.5v11M7.5 10l4.5 4.5 4.5-4.5M4.5 19.5h15" {...p} />;
    case 'sliders':
      return (
        <>
          <Path d="M4 7h10M18 7h2M4 17h4M12 17h8" {...p} />
          <Circle cx={16} cy={7} r={2} {...p} />
          <Circle cx={10} cy={17} r={2} {...p} />
        </>
      );
    case 'palette':
      return (
        <>
          <Path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.8-.8 1.8-1.7 0-1.3-1.2-1.6-1.2-2.8 0-1 .8-1.7 1.8-1.7h2.1A4.5 4.5 0 0 0 21 10.3C21 6.2 17 3 12 3z" {...p} />
          <Circle cx={7.5} cy={11} r={1.2} fill={color} />
          <Circle cx={10.5} cy={7} r={1.2} fill={color} />
          <Circle cx={15} cy={7.5} r={1.2} fill={color} />
        </>
      );
    case 'text':
      return <Path d="M3 19l5-14 5 14M4.7 14.5h6.6M15 12.5a3 3 0 0 1 6 0V19M21 15.5c-3.5-.6-6 .2-6 2 0 2.2 4 2.2 6-.5" {...p} />;
    case 'quality':
      return (
        <>
          <Rect x={2.5} y={5} width={19} height={14} rx={2.5} {...p} />
          <Path d="M7 9.5v5M7 12h3M10 9.5v5M13.5 9.5v5h1.8a2.5 2.5 0 0 0 0-5z" {...p} />
        </>
      );
    case 'speed':
      return <Path d="M4 17a8 8 0 1 1 16 0M12 17l4-5.5M7 17h10" {...p} />;
    case 'close':
      return <Path d="M6 6l12 12M18 6L6 18" {...p} />;
    case 'key':
      return (
        <>
          <Circle cx={7.5} cy={15.5} r={4} {...p} />
          <Path d="M10.5 12.5L20 3M16.5 6.5l2.5 2.5M14 9l2 2" {...p} />
        </>
      );
    case 'eye':
      return (
        <>
          <Path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" {...p} />
          <Circle cx={12} cy={12} r={3} {...p} />
        </>
      );
    case 'remote':
      return (
        <>
          <Rect x={7} y={2.5} width={10} height={19} rx={4} {...p} />
          <Circle cx={12} cy={8} r={2} {...p} />
          <Path d="M10 13.5h4M10 16.5h4" {...p} />
        </>
      );
    case 'heart':
      return <Path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.3 4.3 4.3 0 0 1 19.5 10C19.5 15.4 12 20 12 20z" {...p} />;
    case 'data':
      return (
        <>
          <Path d="M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3z" {...p} />
          <Path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" {...p} />
        </>
      );
    case 'sun':
      return (
        <>
          <Circle cx={12} cy={12} r={4.2} {...p} />
          <Path d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6M18.7 18.7l-1.6-1.6M6.9 6.9L5.3 5.3" {...p} />
        </>
      );
    case 'timer':
      return (
        <>
          <Circle cx={12} cy={13.5} r={7.5} {...p} />
          <Path d="M12 9.5v4l2.5 2M9.5 2.5h5M19 6l1.5-1.5" {...p} />
        </>
      );
    case 'tv':
      return (
        <>
          <Rect x={2.5} y={5.5} width={19} height={12.5} rx={2.2} {...p} />
          <Path d="M8 21h8M9 2.5l3 3 3-3" {...p} />
        </>
      );
    case 'rain':
      return (
        <>
          <Path d="M7 14.5a4.5 4.5 0 1 1 1.3-8.8A5.5 5.5 0 0 1 18.8 8a3.5 3.5 0 0 1-.8 6.5z" {...p} />
          <Path d="M8 17.5l-1 3M12.5 17.5l-1 3M17 17.5l-1 3" {...p} />
        </>
      );
    case 'wave':
      return <Path d="M2.5 9c2.4 0 2.4-2 4.75-2S9.6 9 12 9s2.4-2 4.75-2S19.1 9 21.5 9M2.5 15c2.4 0 2.4-2 4.75-2S9.6 15 12 15s2.4-2 4.75-2 2.35 2 4.75 2" {...p} />;
    case 'tree':
      return <Path d="M12 2.5l-5.5 7h3l-4 5.5h4L6 19.5h12l-3.5-4.5h4l-4-5.5h3zM12 19.5v2.5" {...p} />;
    case 'drop':
      return <Path d="M12 3s6.5 6.9 6.5 11.4A6.5 6.5 0 0 1 5.5 14.4C5.5 9.9 12 3 12 3z" {...p} />;
    case 'flame':
      return <Path d="M12 21.5c-4 0-6.5-2.8-6.5-6.4 0-3.6 3-5.6 3.5-9.6 2.6 1.5 4 3.8 4.2 6.3.9-.8 1.5-2 1.7-3.3 2.1 1.8 3.6 4.1 3.6 6.8 0 3.5-2.5 6.2-6.5 6.2z" {...p} />;
    case 'wind':
      return <Path d="M3 8.5h11a3 3 0 1 0-3-3M3 12.5h16a3 3 0 1 1-3 3M3 16.5h7" {...p} />;
    case 'headphones':
      return (
        <>
          <Path d="M3.5 17v-4a8.5 8.5 0 0 1 17 0v4" {...p} />
          <Rect x={3} y={14} width={4.5} height={7} rx={1.6} {...p} />
          <Rect x={16.5} y={14} width={4.5} height={7} rx={1.6} {...p} />
        </>
      );
  }
}
