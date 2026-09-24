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
  | 'mic';

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
  }
}
