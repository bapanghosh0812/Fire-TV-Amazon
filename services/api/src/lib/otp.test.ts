import { test } from 'node:test';
import assert from 'node:assert/strict';
import { codeHash, isDemoPhone, maskPhone, newCode, normalizePhone, otpMessage, phoneHash, sameHash } from './otp';

test('normalizes phone numbers to E.164', () => {
  assert.equal(normalizePhone('+91 98765 43210'), '+919876543210');
  assert.equal(normalizePhone('0044 (20) 7946-0018'), '+442079460018');
  assert.equal(normalizePhone('98765 43210'), undefined); // needs a country code
  assert.equal(normalizePhone('+0123456789'), undefined);
  assert.equal(normalizePhone('+1 555 abc'), undefined);
  assert.equal(normalizePhone(42), undefined);
});

test('masks numbers without revealing them', () => {
  assert.equal(maskPhone('+919876543210'), '+91 ••••• •••10');
  assert.equal(maskPhone('+12025550142'), '+1 ••••• •••42');
});

test('codes are 6 digits and hashes are keyed and constant-time compared', () => {
  for (let i = 0; i < 50; i++) assert.match(newCode(), /^\d{6}$/);
  const a = codeHash('req', '123456', 'pepper');
  assert.ok(sameHash(a, codeHash('req', '123456', 'pepper')));
  assert.ok(!sameHash(a, codeHash('req', '123457', 'pepper')));
  assert.ok(!sameHash(a, codeHash('other', '123456', 'pepper')));
  assert.notEqual(phoneHash('+919876543210', 'a'), phoneHash('+919876543210', 'b'));
});

test('only the fictional 555-01xx range is a demo number', () => {
  assert.ok(isDemoPhone('+12025550100'));
  assert.ok(isDemoPhone('+14155550199'));
  assert.ok(!isDemoPhone('+12025550200'));
  assert.ok(!isDemoPhone('+12025551234'));
  assert.ok(!isDemoPhone('+919876543210'));
});

test('localized SMS text always carries the code', () => {
  for (const l of ['en', 'hi-IN', 'es', 'fr', 'de', 'pt-BR', 'ja', 'ar', 'xx']) assert.ok(otpMessage('246810', l).includes('246810'));
});
