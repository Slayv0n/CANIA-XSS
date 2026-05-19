import shutil
import re
import logging
import lancedb
from pathlib import Path
from agno.knowledge.embedder.sentence_transformer import SentenceTransformerEmbedder

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)-5s | %(message)s")
logger = logging.getLogger(__name__)

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
DB_URI = SCRIPT_DIR / "security_docs_lancedb"
SOURCE_DIR = SCRIPT_DIR / "ai_agent_terminal" / "security_docs_db"

FILENAME_TAG_MAP = {
    'generic': 'GENERIC', 'angular': 'ANGULAR', 'react': 'REACT',
    'vue': 'VUE', 'jquery': 'JQUERY', 'dom_xss': 'DOM_XSS',
    'waf_bypass': 'WAF_BYPASS', 'polyglot': 'POLYGLOT'
}
TECH_TAG_PATTERN = re.compile(r'^\[([A-Z0-9_]+)\]\s*(.*)')

def safe_remove_db(path: Path):
    """🛡️ Защищенное удаление старой БД"""
    if not path.exists():
        return
    if path.name != "security_docs_lancedb":
        logger.warning(f"⚠️ Попытка удаления нестандартной папки: {path}. Отмена.")
        return
    if path.parent.resolve() != SCRIPT_DIR.resolve():
        logger.error(f"❌ Папка БД находится за пределами ai-agents! Отмена удаления.")
        return
    
    logger.info(f"🗑️ Удаляю старую базу: {path}")
    shutil.rmtree(path)

def run_manual_ingest():
    xss_folder = SOURCE_DIR / "xss_payloads"
    tool_folder = SOURCE_DIR / "tool_documentation"

    if not xss_folder.exists() or not tool_folder.exists():
        logger.error(f"❌ Не найдены папки: {xss_folder} или {tool_folder}")
        return

    safe_remove_db(DB_URI)

    logger.info(f"📂 XSS исходники: {xss_folder}")
    logger.info(f"📂 Docs исходники: {tool_folder}")
    logger.info(f"💾 Инициализация БД в: {DB_URI}")

    embedder = SentenceTransformerEmbedder(id="all-MiniLM-L6-v2")
    db = lancedb.connect(str(DB_URI))

    xss_data = []
    tool_data = []

    xss_files = list(xss_folder.glob("*.txt"))
    logger.info(f"📄 Найдено XSS файлов: {len(xss_files)}")

    for txt_file in xss_files:
        try:
            with open(txt_file, "r", encoding="utf-8") as f:
                content = f.read()
            
            file_stem = txt_file.stem.lower()
            default_tag = FILENAME_TAG_MAP.get(file_stem, "GENERIC")
            
            lines = [line.strip() for line in content.splitlines() 
                     if line.strip() and not line.startswith("#")]
            
            for line in lines:
                match = TECH_TAG_PATTERN.match(line)
                if match:
                    tag, payload = match.group(1), match.group(2).strip()
                else:
                    tag, payload = default_tag, line.strip()

                if payload:
                    xss_data.append({
                        "vector": embedder.get_embedding(payload),
                        "text": payload,
                        "metadata": {"source": txt_file.name, "tech_tags": [tag]}
                    })
        except Exception as e:
            logger.error(f"⚠️ Ошибка обработки файла {txt_file}: {e}")

    tool_files = list(tool_folder.glob("*.txt"))
    logger.info(f"📄 Найдено Doc файлов: {len(tool_files)}")

    for txt_file in tool_files:
        try:
            with open(txt_file, "r", encoding="utf-8") as f:
                content = f.read()
            
            chunks = [content[i:i+1000] for i in range(0, len(content), 1000)]
            for chunk in chunks:
                if chunk.strip():
                    tool_data.append({
                        "vector": embedder.get_embedding(chunk),
                        "text": chunk,
                        "metadata": {"source": txt_file.name, "type": "documentation"}
                    })
        except Exception as e:
            logger.error(f"⚠️ Ошибка обработки файла {txt_file}: {e}")

    if xss_data:
        db.create_table("xss_payloads", data=xss_data)
        logger.info(f"✅ Таблица 'xss_payloads': {len(xss_data)} записей")
    else:
        logger.warning("⚠️ XSS-данных нет, таблица не создана.")
        
    if tool_data:
        db.create_table("tool_docs", data=tool_data)
        logger.info(f"✅ Таблица 'tool_docs': {len(tool_data)} записей")
    else:
        logger.warning("⚠️ Документации нет, таблица не создана.")

    logger.info("🎉 Инициализация завершена! База готова к работе.")

if __name__ == "__main__":
    run_manual_ingest()