# ai_agent_reporter/ai_agent_reporter.py
import os
import uuid
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

from agno.agent import Agent
from agno.models.openai import OpenAIChat
from pymongo import MongoClient

load_dotenv()

# === MongoDB Config ===
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB = os.getenv("MONGO_DB", "cania_xss")
MONGO_COLLECTION = os.getenv("MONGO_COLLECTION", "reports")

mongo_client = MongoClient(MONGO_URI)
mongo_db = mongo_client[MONGO_DB]
reports_collection = mongo_db[MONGO_COLLECTION]


# === Инструменты для агента (стандартные функции, без декораторов) ===
def save_report_to_disk(report_content: str, filename: str = "xss_audit_report.md") -> str:
    """Сохраняет отчет в Markdown-файл на диск"""
    try:
        reports_dir = Path("reports")
        reports_dir.mkdir(exist_ok=True)
        file_path = reports_dir / filename
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(report_content)
        return f"✅ Отчет сохранен на диск: {file_path}"
    except Exception as e:
        return f"❌ Ошибка сохранения на диск: {e}"


def save_report_to_db(report_content: str, target_url: str, task_id: str) -> str:
    """Сохраняет отчет в MongoDB"""
    try:
        doc = {
            "task_id": task_id,
            "target": target_url,
            "timestamp": datetime.utcnow().isoformat(),
            "report_content": report_content,
            "format": "markdown",
            "status": "completed"
        }
        result = reports_collection.insert_one(doc)
        return f"✅ Отчет сохранен в MongoDB ({MONGO_DB}.{MONGO_COLLECTION}). ID: {result.inserted_id}"
    except Exception as e:
        return f"❌ Ошибка сохранения в MongoDB: {e}"


# === Модель LLM ===
model = OpenAIChat(
    id=os.getenv("ID_MODEL", "google/gemini-flash-1.5"),
    api_key=os.getenv("OPENROUTER_API_KEY"),
    base_url="https://openrouter.ai/api/v1",
    temperature=0.0,  # Детерминизм для инструментов
    timeout=120,
    max_retries=3
)


# === Агент Reporter ===
reporter_agent = Agent(
    name="Reporter",
    role="Аналитик безопасности",
    model=model,
    tools=[save_report_to_disk, save_report_to_db],
    instructions=[
        "Ты — эксперт по безопасности, генерирующий отчеты по стандарту PTES.",
        "🔥 ТРЕБОВАНИЯ К ФОРМАТУ:",
        "1. Весь отчет НА РУССКОМ языке",
        "2. Строго следуй этой структуре:",
        "",
        "# 📋 Отчет по аудиту XSS",
        "## 🎯 Цель: {target_url}",
        "## 🕐 Дата: {timestamp}",
        "",
        "### 🔍 Краткий обзор",
        "- Методика: автоматизированное сканирование с AI-планированием атак",
        "- Объем: {N} полей протестировано на {M} страницах",
        "- Результат: {X} уязвимостей обнаружено",
        "",
        "### 🚨 Найденные уязвимости",
        "#### Уязвимость #{N}",
        "- **Где**: Страница `/path`, поле `{human_name}`",
        "- **Тип**: Reflected XSS / Stored XSS / DOM XSS",
        "- **Пейлоад**: `{payload}`",
        "- **Доказательство**: [Опиши, что произошло при вводе]",
        "- **Риск**: Низкий / Средний / Высокий",
        "- **Рекомендация**: [Конкретный шаг по исправлению]",
        "",
        "### 📊 Статистика",
        "| Метрика | Значение |",
        "|---------|----------|",
        "| Протестировано полей | {N} |",
        "| Успешных атак | {X} |",
        "| Отражено без выполнения | {Y} |",
        "| Пропущено (лимит/ошибка) | {Z} |",
        "",
        "### 🛡️ Общие рекомендации",
        "1. Внедрить контекстное экранирование вывода",
        "2. Настроить Content-Security-Policy заголовок",
        "3. Проводить регулярное тестирование",
        "⚠️ ПРАВИЛА:",
        "- Не используй индексы типа 'поле #0' — только human_name",
        "- Не выдумывай уязвимости — пиши только то, что подтверждено",
        "- Если уязвимостей нет — честно напиши 'Уязвимостей не обнаружено'",
        "🔧 ДЕЙСТВИЯ:",
        "1. Сгенерируй отчет по шаблону выше",
        "2. Вызови save_report_to_disk(report_content=отчет) для локальной копии",
        "3. Вызови save_report_to_db(report_content=отчет, target_url=цель, task_id=уникальный_id) для базы",
        "4. Верни короткое подтверждение на русском"
    ],
    markdown=True
)