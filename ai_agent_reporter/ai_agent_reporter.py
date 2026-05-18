# ai_agent_reporter/ai_agent_reporter.py
import os
from dotenv import load_dotenv
from agno.agent import Agent
from agno.models.openai import OpenAIChat  # Используем OpenAIChat для OpenRouter
from pathlib import Path

load_dotenv()

model = OpenAIChat(
    id=os.getenv("ID_MODEL", "google/gemini-flash-1.5"),
    api_key=os.getenv("OPENROUTER_API_KEY"),
    base_url="https://openrouter.ai/api/v1",
    temperature=0.3,
    timeout=60
)

def save_report_to_disk(report_content: str, filename: str = "xss_audit_report.md"):
    """
    Сохраняет текст отчета в файл.
    Вызов: save_report_to_disk(report_content='текст', filename='report.md')
    ⚠️  НАЗВАНИЕ ФУНКЦИИ: save_report_to_disk (с подчеркиванием!)
    """
    reports_dir = Path("reports")
    reports_dir.mkdir(exist_ok=True)
    file_path = reports_dir / filename
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(report_content)
    return f"✅ Отчет сохранен: {file_path}"

reporter_agent = Agent(
    name="Reporter",
    role="Аналитик безопасности",
    model=model,
    tools=[save_report_to_disk],
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
        
        "⚠️  ПРАВИЛА:",
        "- Не используй индексы типа 'поле #0' — только human_name",
        "- Не выдумывай уязвимости — пиши только то, что подтверждено",
        "- Если уязвимостей нет — честно напиши 'Уязвимостей не обнаружено'",
        
        "🔧 ДЕЙСТВИЯ:",
        "1. Сгенерируй отчет по шаблону выше",
        "2. Вызови save_report_to_db(report_content=отчет, target_url=цель)",
        "3. Верни короткое подтверждение на русском"
    ],
    markdown=True
)