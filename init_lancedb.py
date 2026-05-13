# ai-agents/init_lancedb.py
import shutil
import lancedb
from pathlib import Path
from agno.knowledge.embedder.sentence_transformer import SentenceTransformerEmbedder

SCRIPT_DIR = Path(__file__).parent
DB_URI = SCRIPT_DIR / "security_docs_lancedb"
SOURCE_DIR = SCRIPT_DIR / "ai_agent_terminal" / "security_docs_db"

def run_manual_ingest():
    if not SOURCE_DIR.exists():
        print(f" Папка исходников не найдена: {SOURCE_DIR}")
        return

    print(f"[*] Исходники: {SOURCE_DIR}")
    print(f"[*] База будет создана в: {DB_URI}")
    
    if DB_URI.exists():
        shutil.rmtree(DB_URI)
        print("[!] Старая база удалена.")

    print("[*] Загрузка эмбеддера...")
    embedder = SentenceTransformerEmbedder(id="all-MiniLM-L6-v2")
    db = lancedb.connect(str(DB_URI))

    xss_data = []
    tool_data = []

    files = list(SOURCE_DIR.rglob("*.txt"))
    if not files:
        print("❌ .txt файлов не найдено!")
        return

    print(f"[*] Найдено файлов: {len(files)}")

    for txt_file in files:
        with open(txt_file, "r", encoding="utf-8") as f:
            content = f.read()
            # 🔑 Маршрутизация: если в имени файла или папки есть "xss" → в таблицу XSS
            is_xss = "xss" in txt_file.name.lower() or "xss" in txt_file.parent.name.lower()

            if is_xss:
                # Пейлоады: каждая строка = отдельный вектор
                chunks = [line.strip() for line in content.splitlines() 
                          if line.strip() and not line.startswith("#")]
                target = xss_data
            else:
                # Документация: чанки по 1000 символов
                chunks = [content[i:i+1000] for i in range(0, len(content), 1000)]
                target = tool_data

            for chunk in chunks:
                if chunk.strip():
                    target.append({
                        "vector": embedder.get_embedding(chunk),
                        "text": chunk,
                        "metadata": {"source": txt_file.name}
                    })

    # 🛠 Создаем таблицы
    if xss_data:
        db.create_table("xss_payloads", data=xss_data)
        print(f"✅ Таблица 'xss_payloads': {len(xss_data)} записей")
    else:
        print("⚠️ XSS-данных нет, таблица не создана.")

    if tool_data:
        db.create_table("tool_docs", data=tool_data)
        print(f"✅ Таблица 'tool_docs': {len(tool_data)} записей")
    else:
        print("⚠️ Документации нет, таблица не создана.")

    print("\n🎉 Готово! Структура базы:")
    print(f"   📂 {DB_URI}/")
    print(f"      ├── xss_payloads.lance/  ← для Exploiter")
    print(f"      └── tool_docs.lance/     ← для Terminal/OSINT")

if __name__ == "__main__":
    run_manual_ingest()