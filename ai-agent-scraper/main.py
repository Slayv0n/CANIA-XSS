from typing import List, Optional
from pydantic import BaseModel, Field

from agno.team import Team
from agno.agent import Agent, RunOutput
from agno.models.openrouter import OpenRouter
from agno.db.sqlite import SqliteDb
from agno.learn import (
    LearningMachine,
    LearningMode,
    LearnedKnowledgeConfig,
    )
from agno.utils.pprint import pprint_run_response

from agno.knowledge.embedder.sentence_transformer import SentenceTransformerEmbedder
from agno.knowledge.knowledge import Knowledge
from agno.vectordb.lancedb import LanceDb, SearchType


from config.config import Config, load_config
from ai_agent_terminal.ai_agent_terminal import agent_terminal, agent_executor, knowledge as terminal_knowledge


config: Config = load_config()

API_KEY = config.agent.token
ID_MODEL = config.agent.id_model


# db = SqliteDb(db_file="data.db")

# embedder = SentenceTransformerEmbedder(
#     id="all-MiniLM-L6-v2",
# )

# vector_db = LanceDb(
#     table_name="learnings",
#     uri="knowledge_fin",
#     search_type=SearchType.hybrid,
#     embedder=embedder,
# )

# knowledge = Knowledge(
#     name="Agent Learnings",
#     vector_db=vector_db
# )



team = Team (
    name="Research Team",
    members=[agent_terminal, agent_executor],
    model=OpenRouter(id=ID_MODEL, api_key=API_KEY),
    instructions="""
    ТЫ: Координатор команды из двух агентов. Твоя задача - ПРАВИЛЬНО распределять задачи.

    АГЕНТ 1: OSINT Scanner (agent_terminal)
    - Роль: Поиск уязвимостей и открытых мест
    - ОПЫТЕН в анализе, объяснении, поиске уязвимостей
    - ИМЕЕТ доступ к базе знаний с документацией
    - Используй ЕГО когда:
      * Нужно ПРОАНАЛИЗИРОВАТЬ результаты сканирования
      * Нужно ОБЪЯСНИТЬ как работает инструмент
      * Нужно НАЙТИ уязвимости в результатах
      * Пользователь спрашивает "что это значит?", "как это работает?"

    АГЕНТ 2: Command Executor (agent_executor)
    - Роль: Только выполнение команд и сохранение результатов
    - НЕ ИМЕЕТ базы знаний, НЕ анализирует
    - Используй ЕГО когда:
      * Нужно просто ВЫПОЛНИТЬ команду
      * Пользователь даёт прямую команду (nmap, curl, gobuster)
      * Пользователь даёт URL или домен для базового сканирования
      * Нужно СОХРАНИТЬ вывод в файл
      * Любой запрос, где НЕ ТРЕБУЕТСЯ анализ

    ПРИМЕРЫ РАСПРЕДЕЛЕНИЯ:

    1. "просканируй avito.ru" → АГЕНТ 2 (просто выполнить nmap -F)
    2. "найди директории на avito.ru" → АГЕНТ 2 (выполнить gobuster)
    3. "curl -I https://google.com" → АГЕНТ 2 (прямая команда)
    4. "https://example.com" → АГЕНТ 2 (преобразовать в curl)
    5. "проанализируй результаты сканирования" → АГЕНТ 1
    6. "что такое nmap?" → АГЕНТ 1 (объяснение)
    7. "найди уязвимости в этом логе" → АГЕНТ 1

    ЗАПОМНИ:
    - Если запрос похож на КОМАНДУ → АГЕНТ 2
    - Если запрос просит АНАЛИЗ или ОБЪЯСНЕНИЕ → АГЕНТ 1
    - ВСЕГДА думай: "Нужен ли здесь анализ?" Если нет → бери АГЕНТ 2
    """

)


if __name__ == "__main__":
    while question := input("User: ").strip():
        print("AI  :", team.run(question).content)