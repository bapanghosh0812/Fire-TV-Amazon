import React, { memo, useMemo } from 'react';
import { Text, type TextStyle } from 'react-native';
import type { WordMark } from '@storyloom/protocol';
import { tokenize } from './readAlong';
import { colors, type } from '../theme/tokens';

interface Props {
  text: string;
  marks: WordMark[];
  activeIndex: number; // index into marks
  highlight: boolean;
  style?: TextStyle;
  mode?: 'glow' | 'underline' | 'box';
  color?: string;
  rtl?: boolean;
}

/** Story text where the word being read lights up, karaoke-style. */
export const ReadAlongText = memo(function ReadAlongText({ text, marks, activeIndex, highlight, style, mode = 'glow', color = colors.parchment, rtl }: Props) {
  const tokens = useMemo(() => tokenize(text), [text]);
  const active = activeIndex >= 0 ? marks[activeIndex] : undefined;
  const readUntil = active ? active.s : -1;
  const unread = color === colors.parchment ? 'rgba(247,241,227,0.62)' : color;

  const activeStyle: TextStyle =
    mode === 'box'
      ? { color: colors.night, backgroundColor: colors.gold }
      : mode === 'underline'
        ? { color, textDecorationLine: 'underline', textDecorationColor: colors.gold, backgroundColor: 'transparent' }
        : { color: '#FFFFFF', backgroundColor: 'rgba(245,198,107,0.42)', textShadowColor: 'rgba(255,190,90,0.85)', textShadowRadius: 6 };

  return (
    <Text style={[type.story, { color }, style, rtl ? { writingDirection: 'rtl', textAlign: 'right' } : null]}>
      {tokens.map((tok, i) => {
        if (!highlight) return tok.text;
        const isActive = !!active && tok.isWord && tok.start <= active.s && active.s < tok.end;
        const isRead = tok.end <= readUntil;
        return (
          <Text
            key={i}
            // Android keeps a nested span's old background unless it is explicitly reset.
            style={isActive ? activeStyle : { color: isRead ? color : unread, backgroundColor: 'transparent', textDecorationLine: 'none', textShadowRadius: 0 }}
          >
            {tok.text}
          </Text>
        );
      })}
    </Text>
  );
});
