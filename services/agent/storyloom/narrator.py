"""The Narrator: Amazon Polly reads each page, with word timings for read-along."""

import logging
import re
from concurrent.futures import ThreadPoolExecutor

from . import languages
from .config import client
from .mp3 import duration_ms, strip_id3

log = logging.getLogger(__name__)

# Script-agnostic: a "word" is any run without spaces or punctuation, so Hindi
# vowel signs stay inside their word and Japanese/Chinese read by phrase.
PUNCT = r"\s.,!?…;:\"“”()\[\]{}—–、，。！？：；「」『』《》।॥،؟؛"
WORD = re.compile(f"[^{PUNCT}]+")
# Sentence ends: Latin, CJK, Devanagari danda (।) and Arabic question mark (؟).
SENTENCE = re.compile(r"[^.!?…。！？।॥؟]+[.!?…。！？।॥؟]+[”\"’'」』]*|[^.!?…。！？।॥؟]+$")

LEAD_IN_MS = 90
TAIL_MS = 180


def _sentences(text: str) -> list[tuple[int, int]]:
    spans = []
    for m in SENTENCE.finditer(text):
        s, e = m.start(), m.end()
        while s < e and text[s].isspace():
            s += 1
        if s < e:
            spans.append((s, e))
    return spans or [(0, len(text))]


def _synth(text: str, voice: str, language_code: str) -> bytes:
    polly = client("polly")
    for engine in ("generative", "neural"):
        try:
            r = polly.synthesize_speech(
                Text=text, VoiceId=voice, LanguageCode=language_code, Engine=engine, OutputFormat="mp3", SampleRate="24000"
            )
            return r["AudioStream"].read()
        except Exception as e:  # not every voice has a generative model; fall back to neural
            log.info("polly %s/%s unavailable (%s), trying next engine", voice, engine, type(e).__name__)
            if engine == "neural":
                raise
    raise RuntimeError("No voice engine available")


def narrate(text: str, language: str = languages.DEFAULT, voice: str | None = None) -> tuple[bytes, list[dict], int]:
    """Returns (mp3, word marks, duration). Marks: {t: ms, s: start char, e: end char}."""
    lang = languages.info(language)
    voice = voice or lang["voice"]
    spans = _sentences(text)
    with ThreadPoolExecutor(max_workers=4) as pool:
        clips = list(pool.map(lambda span: _synth(text[span[0]:span[1]], voice, lang["code"]), spans))

    audio = bytearray()
    marks: list[dict] = []
    offset = 0
    for (s, e), clip in zip(spans, clips):
        dur = duration_ms(clip) or 400
        words = [(s + m.start(), s + m.end()) for m in WORD.finditer(text[s:e])]
        speak = max(1, dur - LEAD_IN_MS - TAIL_MS)
        weights = [max(2, we - ws) + 2 for ws, we in words]  # longer words take longer to say
        total = sum(weights) or 1
        t = offset + LEAD_IN_MS
        for (ws, we), w in zip(words, weights):
            marks.append({"t": int(t), "s": ws, "e": we})
            t += speak * w / total
        audio += strip_id3(clip)
        offset += dur
    return bytes(audio), marks, offset
