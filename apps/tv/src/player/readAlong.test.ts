import { test } from 'node:test';
import assert from 'node:assert/strict';
import { activeMarkAt, buildTimeline, tokenize } from './readAlong';

const words = (text: string) => tokenize(text).filter((t) => t.isWord).map((t) => t.text);

test('english words keep apostrophes', () => {
  assert.deepEqual(words('Luna’s crown, the moon’s light!'), ['Luna’s', 'crown', 'the', 'moon’s', 'light']);
});

test('hindi words keep their vowel signs', () => {
  assert.deepEqual(words('लूना एक छोटा बैंगनी ड्रैगन थी।'), ['लूना', 'एक', 'छोटा', 'बैंगनी', 'ड्रैगन', 'थी']);
});

test('japanese splits by phrase', () => {
  assert.deepEqual(words('ルナは小さなドラゴンでした。月の灯台に、住んでいました。'), ['ルナは小さなドラゴンでした', '月の灯台に', '住んでいました']);
});

test('estimated timeline is ordered and lookups work', () => {
  const { marks, durationMs } = buildTimeline('One two three. Four.');
  assert.equal(marks.length, 4);
  assert.ok(marks.every((m, i) => i === 0 || m.t > marks[i - 1].t));
  assert.ok(durationMs > marks[3].t);
  assert.equal(activeMarkAt(marks, 0), -1);
  assert.equal(activeMarkAt(marks, marks[2].t + 1), 2);
});
