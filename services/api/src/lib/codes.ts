import { randomInt } from 'node:crypto';

// No I or O (look like 1 and 0 on a TV from the sofa).
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

// Codes appear on a family TV, so a few four-letter words are never dealt.
const BLOCKED = new Set([
  'ANAL', 'ARSE', 'BUTT', 'BOOB', 'CRAP', 'COCK', 'CUNT', 'DAMN', 'DICK', 'DEAD', 'DUMB', 'FART', 'FUCK', 'FUCK',
  'HELL', 'JERK', 'KILL', 'NAZI', 'PISS', 'POOP', 'PORN', 'PUKE', 'SCUM', 'SEXY', 'SHIT', 'SLUT', 'SUCK', 'TITS',
  'TWAT', 'UGLY', 'WANK', 'HATE', 'GUNS', 'DRUG', 'BLAH',
]);

export function newRoomCode() {
  for (;;) {
    const code = Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
    if (!BLOCKED.has(code)) return code;
  }
}

export function isValidCode(code: string) {
  return /^[A-HJ-NP-Z]{4}$/.test(code);
}
