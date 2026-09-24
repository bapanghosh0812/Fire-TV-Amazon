// Thin wrapper over the browser's speech recognition (Chrome/Android, Safari).
// Falls back gracefully: callers always offer typing as well.

interface RecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start(): void;
  stop(): void;
}

type Ctor = new () => RecognitionLike;

function getCtor(): Ctor | undefined {
  const w = window as unknown as { SpeechRecognition?: Ctor; webkitSpeechRecognition?: Ctor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export const speechSupported = () => !!getCtor();

export function listen(onText: (text: string, final: boolean) => void, onDone: (error?: string) => void) {
  const C = getCtor();
  if (!C) {
    onDone('unsupported');
    return () => {};
  }
  const rec = new C();
  rec.lang = navigator.language || 'en-US';
  rec.interimResults = true;
  rec.continuous = false;
  rec.onresult = (e) => {
    let text = '';
    let final = false;
    for (let i = 0; i < e.results.length; i++) {
      text += e.results[i][0].transcript;
      final = e.results[i].isFinal;
    }
    onText(text.trim(), final);
  };
  rec.onerror = (e) => onDone(e.error);
  rec.onend = () => onDone();
  rec.start();
  return () => rec.stop();
}
