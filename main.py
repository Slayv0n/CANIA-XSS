import os
from dotenv import load_dotenv

load_dotenv()

def ensure_env(key, default_value):
    if not os.getenv(key):
        os.environ[key] = default_value

ensure_env("OPENAI_API_KEY", "placeholder") 
ensure_env("ID_MODEL", "qwen/qwen3-coder:free")
ensure_env("BOT_TOKEN", "12345:dummy")

from typing import List, Optional
from pydantic import BaseModel, Field

from agno.team import Team
from agno.agent import Agent, RunOutput
from agno.models.ollama import Ollama
from agno.db.sqlite import SqliteDb
from agno.utils.pprint import pprint_run_response

from config.config import Config, load_config
from ai_agent_terminal.ai_agent_terminal import agent_terminal, agent_executor, knowledge as terminal_knowledge
from ai_agent_scraper.ai_agent_scraper import parser_agent

from ai_agent_planner.ai_agent_planner import planner_agent
from ai_agent_exploiter.ai_agent_exploiter import exploiter_agent
from ai_agent_reporter.ai_agent_reporter import reporter_agent

config: Config = load_config()

API_KEY = os.getenv("OPENAI_API_KEY") 
ID_MODEL = os.getenv("ID_MODEL")

team = Team (
    name="CANIA-XSS Research Team",
    members=[
        agent_terminal, 
        agent_executor, 
        parser_agent, 
        planner_agent,
        exploiter_agent,
        reporter_agent 
    ], 
    model=Ollama(id="qwen2.5-coder:7b"),
    debug_mode=True,
  
    instructions="""
    ТЫ: Координатор CANIA-XSS. РАБОТАЙ СТРОГО ПО ШАГАМ.
    НЕ ПИШИ ТЕКСТ. ТОЛЬКО ВЫЗЫВАЙ ИНСТРУМЕНТЫ.

    ПЛАН:
    1. Вызови 'task-planner' для создания плана.
    2. Вызови 'command-executor' для curl запроса.
    3. Вызови 'data-parser' для поиска параметров.
    4. Вызови 'xss-exploiter' для проверки.
    5. Вызови 'security-reporter' для отчета.

    Если получил результат от одного агента — сразу вызывай следующего. Не объясняй свои действия.
    """
)
# Это странная инструкция 

if __name__ == "__main__":
    print("="*60)
    print("🚀 Система CANIA-XSS готова!")
    print("Введите цель (например: Проверь на XSS http://testphp.vulnweb.com/listproducts.php?cat=1)")
    print("="*60)

    while question := input("\nUser: ").strip():
        if question.lower() in ['exit', 'quit', 'q']:
            break
        
        try:
            # Запуск системы
            response = team.run(question)
            print("\nAI Ответ :", response.content)
        except Exception as e:
            print(f"\n❌ Ошибка: {e}")