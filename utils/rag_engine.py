import logging
import lancedb
from pathlib import Path
from agno.knowledge.embedder.sentence_transformer import SentenceTransformerEmbedder
from typing import List, Optional

class RagEngine:
    def __init__(self, table_name: str, db_path: str = None):
        if db_path is None:
            db_path = Path(__file__).parent.parent / "security_docs_lancedb"
        self.db_path_str = str(db_path.resolve())
        self.table_name = table_name
        self._db = None
        self._embedder = None
        self._table = None

    @property
    def db(self):
        if self._db is None:
            self._db = lancedb.connect(self.db_path_str)
        return self._db

    @property
    def embedder(self):
        if self._embedder is None:
            logging.info("🧠 Загрузка модели эмбеддингов для RAG (первый запрос)...")
            self._embedder = SentenceTransformerEmbedder(id="all-MiniLM-L6-v2")
        return self._embedder

    @property
    def table(self):
        if self._table is None:
            try:
                self._table = self.db.open_table(self.table_name)
            except Exception as e:
                logging.warning(f"Таблица '{self.table_name}' не найдена: {e}")
                self._table = None
        return self._table

    def search_payloads(self, query: str, tech_tags: Optional[List[str]] = None, limit: int = 5) -> List[str]:
        if not self.table: return []
        try:
            query_vector = self.embedder.get_embedding(query)
            results = self.table.search(query_vector).limit(limit * 3).to_list()
            
            matched, fallback = [], []
            for row in results:
                meta = row.get("metadata", {})
                tags = meta.get("tech_tags", [])
                payload = row.get("text", "")
                
                if not payload: continue
                
                if tech_tags and any(t in tech_tags for t in tags):
                    matched.append(payload)
                elif "GENERIC" in tags or not tech_tags:
                    fallback.append(payload)
                    
            return (matched + fallback)[:limit]
        except Exception as e:
            print(f"[!] Ошибка RAG поиска: {e}")
            return []