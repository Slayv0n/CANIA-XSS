from rag_engine import RagEngine
engine = RagEngine()
print(engine.search_payloads("React XSS input"))
# Должен вывести список строк, а не ошибку или одну склеенную строку.