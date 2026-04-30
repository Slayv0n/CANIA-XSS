import lancedb
from agno.knowledge.embedder.sentence_transformer import SentenceTransformerEmbedder

class RagEngine:
    def __init__(self, db_path="security_docs_lancedb"):
        self.db = lancedb.connect(db_path)
        # Используем ту же модель эмбеддингов, что была при создании базы
        self.embedder = SentenceTransformerEmbedder(id="all-MiniLM-L6-v2")
        try:
            self.table = self.db.open_table("security_tools")
        except:
            self.table = None

    def search_payloads(self, tech_stack: str):
        if not self.table:
            return "База данных пейлоадов не найдена."
        
        # Поиск наиболее подходящих векторов атак под стек технологий
        # Примечание: query должен быть строкой, Agno/LanceDB сам применит эмбеддер если настроено, 
        # но для надежности в кастомном методе можно так:
        results = self.table.search(tech_stack).limit(5).to_list()
        
        payloads = [r.get('text', '') for r in results]
        return "\n".join(payloads) if payloads else "Специфичных пейлоадов не найдено."