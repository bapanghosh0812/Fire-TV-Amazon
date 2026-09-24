import React, { memo, useMemo } from 'react';
import { Text } from 'react-native';
import type { WordMark } from '@storyloom/protocol';
import { tokenize } from './readAlong';
import { colors, type } from '../theme/tokens';

interface Props {
  text: string;
  marks: WordMark[];
  activeIndex: number; // index into marks
  highlight: boolean;
  fontScale?: number;
}

/** Story text where the word being read glows gold, karaoke-style. */
export const ReadAlongText = memo(function ReadAlongText({ text, marks, activeIndex, highlight, fontScale = 1 }: Props) {
  const tokens = useMemo(() => tokenize(text), [text]);
  const active = activeIndex >= 0 ? marks[activeIndex] : undefined;
  const readUntil = active ? active.s : -1;

  return (
    <Text
      style={[
        type.story,
        { color: colors.parchment, fontSize: type.story.fontSize * fontScale, lineHeight: type.story.lineHeight * fontScale },
      ]}
    >
      {tokens.map((tok, i) => {
        if (!highlight) return tok.text;
        const isActive = !!active && tok.isWord && tok.start <= active.s && active.s < tok.end;
        const isRead = tok.end <= readUntil;
        return (
          <Text
            key={i}
            style={
              isActive
                ? { color: colors.night, backgroundColor: colors.gold }
                : { color: isRead ? colors.parchment : 'rgba(247,241,227,0.62)' }
            }
          >
            {isActive ? `${tok.text}` : tok.text}
          </Text>
        );
      })}
    </Text>
  );
});
