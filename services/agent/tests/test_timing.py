from unittest import mock

from storyloom import languages, mp3, narrator


def fake_mp3(frames: int) -> bytes:
    # MPEG-2 Layer III, 48 kbps, 24 kHz, mono: 144-byte frames of 576 samples.
    header = bytes([0xFF, 0xF3, 0x64, 0xC4])
    return (header + bytes(140)) * frames


def test_duration_counts_frames():
    assert mp3.duration_ms(fake_mp3(100)) == 2400


def test_duration_skips_id3_tag():
    tag = b"ID3" + bytes([4, 0, 0, 0, 0, 0, 10]) + bytes(10)
    assert mp3.duration_ms(tag + fake_mp3(50)) == 1200
    assert mp3.strip_id3(tag + b"xyz") == b"xyz"


def test_sentences_split_on_punctuation():
    text = "Luna flew up. “Hello!” she said… Then she slept"
    spans = narrator._sentences(text)
    assert [text[s:e] for s, e in spans] == ["Luna flew up.", "“Hello!”", "she said…", "Then she slept"]


def narrate(text: str, language: str):
    with mock.patch.object(narrator, "_synth", side_effect=lambda t, v, l: fake_mp3(100)) as synth:
        result = narrator.narrate(text, language)
    return result, synth


def test_marks_cover_every_word_in_order():
    text = "Luna flew up. She smiled at the moon."
    (audio, marks, dur), synth = narrate(text, "en-US")
    assert [text[m["s"]:m["e"]] for m in marks] == ["Luna", "flew", "up", "She", "smiled", "at", "the", "moon"]
    assert all(a["t"] < b["t"] for a, b in zip(marks, marks[1:]))
    assert dur == 4800
    assert marks[3]["t"] >= 2400  # second sentence starts after the first clip
    assert synth.call_args.args[1:] == ("Ruth", "en-US")


def test_hindi_words_keep_their_vowel_signs():
    text = "लूना एक छोटा बैंगनी ड्रैगन थी। वह चाँद पर रहती थी।"
    (_, marks, _), synth = narrate(text, "hi-IN")
    words = [text[m["s"]:m["e"]] for m in marks]
    assert words == ["लूना", "एक", "छोटा", "बैंगनी", "ड्रैगन", "थी", "वह", "चाँद", "पर", "रहती", "थी"]
    assert synth.call_count == 2  # split into two sentences at the danda
    assert synth.call_args.args[1:] == ("Kajal", "hi-IN")


def test_japanese_reads_by_phrase():
    text = "ルナは小さなドラゴンでした。月の灯台に、住んでいました。"
    (_, marks, _), _ = narrate(text, "ja-JP")
    assert [text[m["s"]:m["e"]] for m in marks] == ["ルナは小さなドラゴンでした", "月の灯台に", "住んでいました"]


def test_unknown_language_falls_back_to_english():
    assert languages.info("xx-XX")["code"] == "en-US"
