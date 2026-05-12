import lancedb
from pathlib import Path
from agno.knowledge.embedder.sentence_transformer import SentenceTransformerEmbedder
from typing import List

class RagEngine:
    def __init__(self, db_path: str = None):
        # Путь теперь абсолютный и надежный
        if db_path is None:
            db_path = Path(__file__).parent.parent / "security_docs_lancedb"
        
        db_path_str = str(db_path.resolve())
        print(f"[*] RagEngine ищет базу в: {db_path_str}")
        
        self.db = lancedb.connect(db_path_str)
        self.embedder = SentenceTransformerEmbedder(id="all-MiniLM-L6-v2")

        try:
            self.table = self.db.open_table("security_tools")
            print("[+] Таблица 'security_tools' успешно открыта.")
        except Exception as e:
            print(f"[!] Таблица не найдена. Ошибка: {e}")
            self.table = None

    def search_payloads(self, tech_stack: str) -> List[str]:
        if not self.table:
            return []
        try:
            # ✅ ИСПРАВЛЕНО: get_embedding вместо embed
            # Возвращает List[float] (вектор), который ждет LanceDB
            query_vector = self.embedder.get_embedding(tech_stack)
            
            # Поиск по вектору
            results = self.table.search(query_vector).limit(5).to_list()
            
            # Возвращаем тексты
            return [row["text"] for row in results if row.get("text")]
        except Exception as e:
            print(f"[!] Ошибка RAG поиска: {e}")
            return []