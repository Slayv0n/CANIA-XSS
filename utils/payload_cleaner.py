# utils/payload_cleaner.py
import re
import logging
from pathlib import Path
from collections import defaultdict

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)-5s | %(message)s")
logger = logging.getLogger(__name__)

# 🔍 Паттерн: отсеиваем чистый текст, URL, markdown, пустые строки
# Оставляем только строки с признаками XSS/JS/HTML
VALID_XSS_PATTERN = re.compile(
    r'(<[a-z]|javascript:|on\w+\s*=|alert\(|prompt\(|confirm\(|document\.|location\s*=|eval\(|String\.fromCharCode|expression\(|{{|ng-|v-)',
    re.IGNORECASE
)

def classify_payload(line: str) -> str:
    """
    Автоматическая категоризация по содержимому.
    Приоритет: Фреймворки > WAF Bypass > DOM > Events > Generic
    """
    l = line.lower()
    
    # 1. Фреймворки (специфичный синтаксис)
    if any(k in l for k in ['ng-init', 'ng-click', '{{constructor', '$scope', 'angular.module']):
        return 'ANGULAR'
    if any(k in l for k in ['reactdom', 'dangerouslysetinnerhtml', 'jsx', 'react.element']):
        return 'REACT'
    if any(k in l for k in ['v-html', 'v-on:', '@click', 'vue.component']):
        return 'VUE'

    # 2. WAF Bypass (энкодинг, разрывы, null-bytes)
    if any(k in l for k in ['%3c', '%3e', '&#x', '\\u00', '\\x3c', '\\0', '/*', '*/', 'javascri%70t', 'expression(', 'url(javascript', '@import', 'background-image:']):
        return 'WAF_BYPASS'

    # 3. DOM XSS (работа с объектами браузера)
    if any(k in l for k in ['location.hash', 'document.write', 'innerhtml', 'document.location', 'eval(', 'window.location', 'document.cookie']):
        return 'DOM_XSS'
    
    # 4. Event Handlers (самый частый кейс в современном вебе)
    if any(k in l for k in ['onmouseover', 'onfocus', 'onerror', 'onload', 'onclick', 'onanimation', 'onbegin', 'ondblclick', 'oninput']):
        return 'EVENT_HANDLERS'
    
    # 5. CSS и редкие теги
    if any(k in l for k in ['<style', 'behavior:', '-moz-binding', 'background-image:']):
        return 'CSS_XSS'
    if any(k in l for k in ['<iframe', '<object', '<embed', '<applet', '<form', '<base', '<svg', '<video', '<audio', '<math']):
        return 'EMBEDDED'

    # 6. Fallback
    return 'GENERIC'

def clean_and_sort_payloads(input_dir: str, output_dir: str, max_per_category: int = 80):
    input_path = Path(input_dir)
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    if not input_path.exists():
        logger.error(f"❌ Папка {input_dir} не найдена. Положи сюда .txt файлы с сырыми пейлоадами.")
        return

    files = list(input_path.glob("*.txt"))
    if not files:
        logger.warning("⚠️ В папке нет .txt файлов")
        return

    categorized: dict[str, set[str]] = defaultdict(set)
    total_processed = 0

    logger.info(f"📂 Найдено файлов: {len(files)}. Начинаю обработку...")

    for f in files:
        logger.info(f"📄 Читаю {f.name}...")
        try:
            with open(f, "r", encoding="utf-8", errors="ignore") as fh:
                for line in fh:
                    line = line.strip()
                    # Пропускаем комментарии и мусор
                    if not line or line.startswith(('#', '//', '/*', '---', '===', 'http', 'ftp', 'www.')):
                        continue
                    
                    # Проверка на валидный XSS-код
                    if not VALID_XSS_PATTERN.search(line):
                        continue
                    
                    # Нормализация: убираем лишние кавычки по краям, если они мешают
                    line = re.sub(r'^["\'`]|["\'`]$', '', line).strip()
                    
                    if len(line) < 10:  # Слишком короткие строки обычно битые
                        continue
                        
                    tag = classify_payload(line)
                    categorized[tag].add(line)
                    total_processed += 1
        except Exception as e:
            logger.error(f"⚠️ Ошибка чтения файла {f}: {e}")

    # 💾 Сохранение с лимитами и сортировкой по длине (короткие → надежнее и быстрее)
    saved_count = 0
    for cat, payloads in categorized.items():
        # Сортируем по длине: сначала короткие (меньше шансов быть обрезанными)
        sorted_payloads = sorted(payloads, key=len)[:max_per_category]
        
        out_file = output_path / f"{cat.lower()}.txt"
        with open(out_file, "w", encoding="utf-8") as fh:
            for p in sorted_payloads:
                # Формат для init_lancedb.py: [ТЕГ] пейлоад
                fh.write(f"[{cat}] {p}\n")
                saved_count += 1
        
        logger.info(f"✅ [{cat}] Сохранено {len(sorted_payloads)} уникальных (из {len(payloads)}) → {out_file.name}")

    logger.info(f"🎉 Готово! Обработано строк: {total_processed} | Сохранено в БД-формате: {saved_count}")
    logger.info(f"📂 Готовые файлы лежат в: {output_dir}")

if __name__ == "__main__":
    # 🔧 Пути под твой проект
    clean_and_sort_payloads(
        input_dir="utils/temp_payloads",
        output_dir="ai_agent_terminal/security_docs_db/xss_payloads"
    )