"""Languages Storyloom writes and narrates in (mirrors packages/protocol LANGUAGES)."""

LANGUAGES = {
    "en-US": {"english": "American English", "voice": "Ruth"},
    "en-GB": {"english": "British English", "voice": "Amy"},
    "en-IN": {"english": "Indian English", "voice": "Kajal"},
    "hi-IN": {"english": "Hindi (Devanagari script)", "voice": "Kajal"},
    "es-ES": {"english": "Spanish (Spain)", "voice": "Lucia"},
    "es-MX": {"english": "Mexican Spanish", "voice": "Mia"},
    "fr-FR": {"english": "French", "voice": "Lea"},
    "de-DE": {"english": "German", "voice": "Vicki"},
    "it-IT": {"english": "Italian", "voice": "Bianca"},
    "pt-BR": {"english": "Brazilian Portuguese", "voice": "Camila"},
    "ja-JP": {"english": "Japanese", "voice": "Kazuha"},
    "ko-KR": {"english": "Korean", "voice": "Seoyeon"},
    "ar-AE": {"english": "Modern Standard Arabic", "voice": "Hala"},
    "cmn-CN": {"english": "Mandarin Chinese (Simplified characters)", "voice": "Zhiyu"},
}

DEFAULT = "en-US"


def info(code: str | None) -> dict:
    return LANGUAGES.get(code or DEFAULT, LANGUAGES[DEFAULT]) | {"code": code if code in LANGUAGES else DEFAULT}
