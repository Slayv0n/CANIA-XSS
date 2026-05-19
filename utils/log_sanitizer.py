import re, json
from typing import Any

CONTROL_CHARS = re.compile(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]')

def sanitize_for_llm(raw: str, max_len: int = 12000) -> str:
    clean = CONTROL_CHARS.sub('', raw.replace('\x00', ''))
    return clean[:max_len] + "\n...[TRUNCATED]" if len(clean) > max_len else clean

def safe_parse_json(text: str, fallback: dict[str, Any] = None) -> dict[str, Any]:
    fallback = fallback or {}
    try: return json.loads(text)
    except json.JSONDecodeError:
        try: return json.loads(re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', text).group(1))
        except: return fallback