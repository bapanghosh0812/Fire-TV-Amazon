import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';

/**
 * One-time passcodes for phone sign-in. The phone number itself is never stored:
 * we keep a keyed hash (to find the account again) and the last digits (to show "•••• 1234").
 */

const E164 = /^\+[1-9]\d{7,14}$/;

/** "+91 98765 43210" / "0091-98765..." -> "+919876543210", or undefined if it isn't a phone number. */
export function normalizePhone(input: unknown): string | undefined {
  if (typeof input !== 'string') return undefined;
  let s = input.trim().replace(/[\s().-]/g, '');
  if (s.startsWith('00')) s = `+${s.slice(2)}`;
  return E164.test(s) ? s : undefined;
}

export function phoneHash(phone: string, pepper: string) {
  return createHmac('sha256', pepper).update(`phone:${phone}`).digest('base64url');
}

/** How the number is shown back to the family: country code and the last two digits. */
export function maskPhone(phone: string) {
  const digits = phone.slice(1);
  const cc = digits.length > 10 ? digits.slice(0, digits.length - 10) : digits.slice(0, 1);
  const tail = digits.slice(-2);
  return `+${cc} ••••• •••${tail}`;
}

export function newCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

export function codeHash(requestId: string, code: string, pepper: string) {
  return createHmac('sha256', pepper).update(`otp:${requestId}:${code}`).digest();
}

export function sameHash(a: Buffer, b: Buffer) {
  return a.length === b.length && timingSafeEqual(a, b);
}

// North American 555-0100 … 555-0199 numbers are reserved for fiction and can never
// belong to anyone, so they are safe demo accounts for judges and app reviewers
// (e.g. +1 202 555 0100). No SMS is sent; the code comes from DEMO_OTP_CODE.
const DEMO = /^\+1\d{3}55501\d{2}$/;
export function isDemoPhone(phone: string) {
  return DEMO.test(phone);
}

export const OTP_TTL_SECONDS = 300;
export const OTP_MAX_ATTEMPTS = 5;
export const RESEND_SECONDS = 30;

const MESSAGES: Record<string, (code: string) => string> = {
  en: (c) => `${c} is your Storyloom sign-in code. It expires in 5 minutes. Never share this code with anyone.`,
  hi: (c) => `${c} आपका Storyloom साइन-इन कोड है। यह 5 मिनट में समाप्त हो जाएगा। यह कोड किसी के साथ साझा न करें।`,
  es: (c) => `${c} es tu código para entrar en Storyloom. Caduca en 5 minutos. No lo compartas con nadie.`,
  fr: (c) => `${c} est votre code de connexion Storyloom. Il expire dans 5 minutes. Ne le partagez avec personne.`,
  de: (c) => `${c} ist dein Storyloom-Anmeldecode. Er läuft in 5 Minuten ab. Gib ihn niemals weiter.`,
  pt: (c) => `${c} é o seu código de acesso ao Storyloom. Ele expira em 5 minutos. Não o compartilhe com ninguém.`,
  ja: (c) => `Storyloomのサインインコードは ${c} です。5分で無効になります。このコードは誰にも教えないでください。`,
  ar: (c) => `${c} هو رمز تسجيل الدخول إلى Storyloom. تنتهي صلاحيته خلال 5 دقائق. لا تشارك هذا الرمز مع أي شخص.`,
};

export function otpMessage(code: string, locale?: string) {
  const base = (locale ?? 'en').split('-')[0];
  return (MESSAGES[base] ?? MESSAGES.en)(code);
}
