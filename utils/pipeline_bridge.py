# utils/pipeline_bridge.py
import re
from typing import List, Union
from urllib.parse import urljoin

def extract_osint_paths(raw_output: Union[str, None, object], base_url: str) -> List[str]:
    """
    Извлекает пути из OSINT-вывода. Устойчив к None и объектам Agno.
    """
    paths = []
    
    # 🔥 Конвертация входных данных в строку
    if raw_output is None:
        return []
    if hasattr(raw_output, 'content'):
        raw_output = raw_output.content
    if not isinstance(raw_output, str):
        raw_output = str(raw_output)
    
    # Универсальные паттерны для gobuster/curl
    patterns = [
        r'(/[\w./-]+)\s+\(Status:\s*(\d{3})\)',  # gobuster стандарт
        r'^(/\S+)\s+(\d{3})',                      # gobuster альтернатива
        r"curl.*'([^']+)'\s+\d{3}",                # curl-фоллбэк
    ]
    
    for pattern in patterns:
        for match in re.finditer(pattern, raw_output, re.MULTILINE):
            path = match.group(1)
            status = match.group(2) if match.lastindex >= 2 else "200"
            if status in ('200', '301', '302', '403', '206'):
                full = urljoin(base_url, path)
                if full not in paths:
                    paths.append(full)
    
    return paths[:15]  # Лимит для предотвращения перегрузки