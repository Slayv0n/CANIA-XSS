# utils/rag_engine.py
import lancedb
from pathlib import Path
from agno.knowledge.embedder.sentence_transformer import SentenceTransformerEmbedder
from typing import List

class RagEngine:
    def __init__(self, db_path: str = None, table_name: str = "xss_payloads"): # 🔑 ДОБАВЛЕНО
        if db_path is None:
            db_path = Path(__file__).parent.parent / "security_docs_lancedb"
        
        db_path_str = str(db_path.resolve())
        # print(f"[*] RagEngine ищет базу в: {db_path_str}") # Можно закомментировать шум
        
        self.db = lancedb.connect(db_path_str)
        self.embedder = SentenceTransformerEmbedder(id="all-MiniLM-L6-v2")
        self.table_name = table_name # 🔑 СОХРАНЯЕМ ИМЯ

        try:
            self.table = self.db.open_table(table_name) # 🔑 ОТКРЫВАЕМ НУЖНУЮ
            # print(f"[+] Таблица '{table_name}' открыта.")
        except Exception as e:
            print(f"[!] Таблица '{table_name}' не найдена: {e}")
            self.table = None

    def search_payloads(self, query: str, limit: int = 5) -> List[str]:
        if not self.table:
            return []
        try:
            query_vector = self.embedder.get_embedding(query)
            results = self.table.search(query_vector).limit(limit).to_list()
            return [row["text"] for row in results if row.get("text")]
        except Exception as e:
            print(f"[!] Ошибка RAG поиска: {e}")
            return []