import type { WordMark } from '@storyloom/protocol';

export interface Token {
  text: string;
  start: number;
  end: number;
  isWord: boolean;
}

/** Splits page text into words and the spaces/punctuation between them. */
export function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  const re = /[\p{L}\p{N}’'-]+/gu;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) tokens.push({ text: text.slice(last, m.index), start: last, end: m.index, isWord: false });
    tokens.push({ text: m[0], start: m.index, end: m.index + m[0].length, isWord: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) tokens.push({ text: text.slice(last), start: last, end: text.length, isWord: false });
  return tokens;
}

/**
 * Builds word timings. Uses real speech marks from the narrator when we have
 * them; otherwise estimates a gentle bedtime reading pace (~140 wpm) with
 * pauses after punctuation, so read-along still works offline.
 */
export function buildTimeline(text: string, marks?: WordMark[]): { marks: WordMark[]; durationMs: number } {
  if (marks && marks.length) {
    const lastMark = marks[marks.length - 1];
    return { marks, durationMs: lastMark.t + 900 };
  }
  const out: WordMark[] = [];
  let t = 300;
  for (const tok of tokenize(text)) {
    if (!tok.isWord) {
      if (/[.!?…]/.test(tok.text)) t += 520;
      else if (/[,;:—–]/.test(tok.text)) t += 240;
      continue;
    }
    out.push({ t, s: tok.start, e: tok.end });
    t += 250 + Math.min(tok.text.length, 10) * 32;
  }
  return { marks: out, durationMs: t + 600 };
}

/** Index of the mark being spoken at `ms`, or -1 before the first word. */
export function activeMarkAt(marks: WordMark[], ms: number) {
  let lo = 0;
  let hi = marks.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (marks[mid].t <= ms) {
      ans = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return ans;
}
