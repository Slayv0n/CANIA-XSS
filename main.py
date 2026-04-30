# from typing import List, Optional
# from pydantic import BaseModel, Field

# from agno.team import Team
# from agno.agent import Agent, RunOutput
# from agno.models.openrouter import OpenRouter
# from agno.db.sqlite import SqliteDb
# from agno.learn import (
#     LearningMachine,
#     LearningMode,
#     LearnedKnowledgeConfig,
#     )
# from agno.utils.pprint import pprint_run_response

# from agno.knowledge.embedder.sentence_transformer import SentenceTransformerEmbedder
# from agno.knowledge.knowledge import Knowledge
# from agno.vectordb.lancedb import LanceDb, SearchType


# from config.config import Config, load_config
# from ai_agent_terminal.ai_agent_terminal import agent_terminal, agent_executor, knowledge as terminal_knowledge
# from ai_agent_scraper.ai_agent_scraper import parser_agent  # Импортируем парсер-агент


# config: Config = load_config()

# API_KEY = config.agent.token
# ID_MODEL = config.agent.id_model


# # db = SqliteDb(db_file="data.db")

# # embedder = SentenceTransformerEmbedder(
# #     id="all-MiniLM-L6-v2",
# # )

# # vector_db = LanceDb(
# #     table_name="learnings",
# #     uri="knowledge_fin",
# #     search_type=SearchType.hybrid,
# #     embedder=embedder,
# # )

# # knowledge = Knowledge(
# #     name="Agent Learnings",
# #     vector_db=vector_db
# # )



# team = Team (
#     name="Research Team",
#     members=[agent_terminal, agent_executor, parser_agent],  # Добавили парсера
#     model=OpenRouter(id=ID_MODEL, api_key=API_KEY),
#     debug_mode=True,
#     show_tool_calls=True,
#     instructions="""
#     ТЫ: Координатор команды из трех агентов. Твоя задача - ПРАВИЛЬНО распределять задачи.

#     АГЕНТ 1: OSINT Scanner (agent_terminal)
#     - Роль: Поиск уязвимостей и открытых мест
#     - ОПЫТЕН в анализе, объяснении, поиске уязвимостей
#     - ИМЕЕТ доступ к базе знаний с документацией
#     - Используй ЕГО когда:
#       * Нужно ПРОАНАЛИЗИРОВАТЬ результаты сканирования
#       * Нужно ОБЪЯСНИТЬ как работает инструмент
#       * Нужно НАЙТИ уязвимости в результатах
#       * Пользователь спрашивает "что это значит?", "как это работает?"

#     АГЕНТ 2: Command Executor (agent_executor)
#     - Роль: Только выполнение команд и сохранение результатов
#     - НЕ ИМЕЕТ базы знаний, НЕ анализирует
#     - Используй ЕГО когда:
#       * Нужно просто ВЫПОЛНИТЬ команду
#       * Пользователь даёт прямую команду (nmap, curl, gobuster)
#       * Пользователь даёт URL или домен для базового сканирования
#       * Нужно СОХРАНИТЬ вывод в файл
#       * Любой запрос, где НЕ ТРЕБУЕТСЯ анализ

#     АГЕНТ 3: Data Parser (parser_agent) - НОВЫЙ!
#     - Роль: Парсинг и структурирование данных из результатов сканирования
#     - УМЕЕТ:
#       * Извлекать открытые порты из nmap
#       * Парсить найденные директории из gobuster
#       * Определять технологии из whatweb
#       * Классифицировать уязвимости из nikto
#       * Формировать структурированный JSON с результатами
#     - Используй ЕГО когда:
#       * Получены результаты сканирования и их нужно СТРУКТУРИРОВАТЬ
#       * Нужно выделить КРИТИЧЕСКИЕ уязвимости
#       * Нужно СОХРАНИТЬ результаты в JSON формате
#       * Нужно ПОДГОТОВИТЬ данные для отчета
#       * Пользователь спрашивает "какие порты открыты?", "какие технологии используются?"
#       * Нужно извлечь конкретные данные из результатов сканирования

#     ВАЖНО: Работаем в ТАКОМ ПОРЯДКЕ:
#     1. Если запрос на СКАНИРОВАНИЕ → АГЕНТ 2 выполняет команды
#     2. После получения результатов → АГЕНТ 3 парсит данные
#     3. Если нужно объяснить результаты → АГЕНТ 1 анализирует

#     ПРИМЕРЫ РАСПРЕДЕЛЕНИЯ:

#     Базовое сканирование:
#     1. "просканируй avito.ru" → АГЕНТ 2 (выполнить nmap -F)
#     2. После выполнения → АГЕНТ 3 (распарсить результаты)
#     3. Показать структурированный вывод пользователю

#     Поиск директорий:
#     1. "найди директории на avito.ru" → АГЕНТ 2 (выполнить gobuster)
#     2. После выполнения → АГЕНТ 3 (распарсить пути)
#     3. Выделить критичные директории (/admin, /backup)

#     Полный анализ:
#     1. "проведи полный анализ example.com" → АГЕНТ 2 (выполнить все команды)
#     2. После всех команд → АГЕНТ 3 (распарсить все результаты)
#     3. АГЕНТ 1 (проанализировать уязвимости на основе распарсенных данных)

#     Прямые вопросы:
#     - "какие порты открыты?" → АГЕНТ 3 (если есть предыдущие результаты)
#     - "что такое nmap?" → АГЕНТ 1 (объяснение)
#     - "curl -I https://google.com" → АГЕНТ 2 (прямая команда)

#     ЗАПОМНИ:
#     - Всегда ДУМАЙ в какой последовательности вызывать агентов
#     - Для СКАНИРОВАНИЯ: АГЕНТ 2 → АГЕНТ 3 → (опционально АГЕНТ 1)
#     - Для АНАЛИЗА: АГЕНТ 1
#     - Для ПАРСИНГА: АГЕНТ 3
#     - Если пользователь дал команду с URL → сразу АГЕНТ 2
#     """

# )


# if __name__ == "__main__":
#     print("🔍 OSINT Research Team готов к работе!")
#     print("Доступны агенты:")
#     print("  📡 OSINT Scanner - анализ и объяснения")
#     print("  ⚙️ Command Executor - выполнение команд")
#     print("  📊 Data Parser - структурирование данных")
#     print("\nВведите ваш запрос:")

#     while question := input("\nUser: ").strip():
#         if question.lower() in ['exit', 'quit', 'q']:
#             print("До свидания!")
#             break

#         print("AI  :", team.run(question).content)

import os
from dotenv import load_dotenv
from agno.team import Team
from agno.models.openrouter import OpenRouter

# Импорты всех агентов
from ai_agent_terminal.ai_agent_terminal import agent_terminal, agent_executor
from ai_agent_scraper.ai_agent_scraper import parser_agent
from ai_agent_planner.ai_agent_planner import planner_agent
from ai_agent_exploiter.ai_agent_exploiter import exploiter_agent
from ai_agent_reporter.ai_agent_reporter import reporter_agent

load_dotenv()

model = OpenRouter(
    id=os.getenv("ID_MODEL", "nvidia/nemotron-3-super-120b-a12b:free"), # Убедитесь, что это ваша модель по умолчанию
    api_key=os.getenv("OPENROUTER_API_KEY") # <-- Исправлено на OPENROUTER_API_KEY
)

cania_team = Team(
    name="CANIA-XSS Full Suite",
    members=[
        agent_terminal, agent_executor, parser_agent, 
        planner_agent, exploiter_agent, reporter_agent
    ],
    model=model,
    markdown=True,
    instructions=[
        "Вы — автономная система аудита безопасности CANIA-XSS.",
        "1. OSINT: Используйте agent_executor и parser_agent для разведки.",
        "2. АНАЛИЗ: agent_terminal выявляет точки входа.",
        "3. ЦЕЛЕВОЙ АУДИТ: Planner исследует формы через Playwright.",
        "4. ЭКСПЛУАТАЦИЯ: Exploiter проводит атаки.",
        "5. ОТЧЕТ: Reporter формирует итоговый Markdown-отчет.",
        "Передавайте результаты по цепочке."
    ]
)

if __name__ == "__main__":
    target_url = input("Введите URL для проверки: ").strip()
    if target_url:
        cania_team.run(f"Проведи полный аудит {target_url}")
