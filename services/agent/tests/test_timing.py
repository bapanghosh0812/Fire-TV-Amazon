from unittest import mock

from storyloom import mp3, narrator


def fake_mp3(frames: int) -> bytes:
    # MPEG-2 Layer III, 48 kbps, 24 kHz, mono: 144-byte frames of 576 samples.
    header = bytes([0xFF, 0xF3, 0x64, 0xC4])
    return (header + bytes(140)) * frames


def test_duration_counts_frames():
    assert mp3.duration_ms(fake_mp3(100)) == 2400


def test_duration_skips_id3_tag():
    tag = b"ID3" + bytes([4, 0, 0, 0, 0, 0, 10]) + bytes(10)
    assert mp3.duration_ms(tag + fake_mp3(50)) == 1200


def test_sentences_split_on_punctuation():
    text = "Luna flew up. “Hello!” she said… Then she slept"
    spans = narrator._sentences(text)
    assert [text[s:e] for s, e in spans] == ["Luna flew up.", "“Hello!”", "she said…", "Then she slept"]


def test_marks_cover_every_word_in_order():
    text = "Luna flew up. She smiled at the moon."
    with mock.patch.object(narrator, "_synth", side_effect=lambda t, v: fake_mp3(100)):
        audio, marks, dur = narrator.narrate(text, "Ruth")
    words = ["Luna", "flew", "up", "She", "smiled", "at", "the", "moon"]
    assert [text[m["s"]:m["e"]] for m in marks] == words
    assert all(a["t"] < b["t"] for a, b in zip(marks, marks[1:]))
    assert dur == 4800
    assert marks[3]["t"] >= 2400  # second sentence starts after the first clip
