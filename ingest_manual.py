import os
import shutil
import lancedb
from pathlib import Path
from agno.knowledge.embedder.sentence_transformer import SentenceTransformerEmbedder

# 🔒 Фиксируем директорию скрипта как точку отсчета
SCRIPT_DIR = Path(__file__).parent

# Откуда брать .txt файлы (относительно скрипта)
SOURCE_DIR = SCRIPT_DIR / "ai_agent_terminal" / "security_docs_db"

# Куда создавать базу (строго рядом со скриптом)
DB_URI = SCRIPT_DIR / "security_docs_lancedb"

TABLE_NAME = "security_tools"

def run_manual_ingest():
    if not SOURCE_DIR.exists():
        print(f"❌ Ошибка: Папка с исходниками не найдена:\n   {SOURCE_DIR}")
        return

    print(f"[*] Исходники: {SOURCE_DIR}")
    print(f"[*] База данных будет создана в: {DB_URI}")
    
    if DB_URI.exists():
        shutil.rmtree(DB_URI)
        print(f"[!] Старая база удалена.")

    print("[*] Загрузка модели эмбеддингов (all-MiniLM-L6-v2)...")
    embedder = SentenceTransformerEmbedder(id="all-MiniLM-L6-v2")
    
    db = lancedb.connect(str(DB_URI))
    data_to_insert = []
    
    files = list(SOURCE_DIR.glob("*.txt"))
    if not files:
        print(f" В {SOURCE_DIR} нет .txt файлов!")
        return

    for txt_file in files:
        print(f"[*] Читаю: {txt_file.name}")
        with open(txt_file, "r", encoding="utf-8") as f:
            content = f.read()
            # Чанкинг по 1000 символов
            chunks = [content[i:i+1000] for i in range(0, len(content), 1000)]
            for chunk in chunks:
                if chunk.strip():
                    # ✅ Исправлено: в agno обычно используется метод .embed()
                    vector = embedder.get_embedding(chunk)
                    data_to_insert.append({
                        "vector": vector,
                        "text": chunk,
                        "metadata": {"source": txt_file.name}
                    })

    db.create_table(TABLE_NAME, data=data_to_insert)
    print(f"✅ УСПЕХ! Создана база знаний в: {DB_URI}")
    print(f"📦 Записей: {len(data_to_insert)}")

if __name__ == "__main__":
    run_manual_ingest()