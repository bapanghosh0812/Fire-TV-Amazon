"""Frame-accurate MP3 duration, used to time the read-along highlight.

Polly's generative voices sound the most natural but don't return speech marks,
so we narrate sentence by sentence and measure each clip exactly.
"""

_BITRATES = {
    (1, 3): [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],  # MPEG-1 Layer III
    (2, 3): [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],  # MPEG-2/2.5 Layer III
}
_SAMPLE_RATES = {1: [44100, 48000, 32000], 2: [22050, 24000, 16000], 25: [11025, 12000, 8000]}


def _skip_id3(data: bytes) -> int:
    if data[:3] == b"ID3" and len(data) >= 10:
        size = (data[6] & 0x7F) << 21 | (data[7] & 0x7F) << 14 | (data[8] & 0x7F) << 7 | (data[9] & 0x7F)
        return 10 + size
    return 0


def strip_id3(data: bytes) -> bytes:
    """Polly prefixes each clip with an ID3 tag; drop it so clips concatenate cleanly."""
    return data[_skip_id3(data):]


def duration_ms(data: bytes) -> int:
    i = _skip_id3(data)
    samples = 0
    rate = 0
    n = len(data)
    while i + 4 <= n:
        b1, b2, b3 = data[i + 1], data[i + 2], data[i + 3]
        if data[i] != 0xFF or (b1 & 0xE0) != 0xE0:
            i += 1
            continue
        ver_bits = (b1 >> 3) & 0x03
        layer_bits = (b1 >> 1) & 0x03
        if ver_bits == 1 or layer_bits != 1:  # reserved version / not Layer III
            i += 1
            continue
        version = {3: 1, 2: 2, 0: 25}[ver_bits]
        br_idx = (b2 >> 4) & 0x0F
        sr_idx = (b2 >> 2) & 0x03
        if br_idx in (0, 15) or sr_idx == 3:
            i += 1
            continue
        bitrate = _BITRATES[(1 if version == 1 else 2, 3)][br_idx] * 1000
        rate = _SAMPLE_RATES[version][sr_idx]
        padding = (b2 >> 1) & 0x01
        per_frame = 1152 if version == 1 else 576
        frame_len = (144 if version == 1 else 72) * bitrate // rate + padding
        if frame_len <= 4:
            i += 1
            continue
        samples += per_frame
        i += frame_len
    return int(samples * 1000 / rate) if rate else 0
