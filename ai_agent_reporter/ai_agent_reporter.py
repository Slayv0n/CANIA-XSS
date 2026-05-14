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
        "Ты — эксперт по безопасности, генерирующий отчет для разработчиков и менеджеров.",
        
        "🔥 КРИТИЧЕСКИЕ ТРЕБОВАНИЯ:",
        "1. ВЕСЬ ОТЧЕТ ДОЛЖЕН БЫТЬ НАПИСАН НА РУССКОМ ЯЗЫКЕ",
        "2. При описании уязвимых полей ОБЯЗАТЕЛЬНО указывай:",
        "   - Полный или короткий URL страницы (например, '/login' или 'checkout')",
        "   - Визуальное название поля (из placeholder, aria-label или label)",
        "   - Пример: 'Поле поиска в шапке сайта (placeholder: \"Найти товар\")'",
        "3. ИЗБЕГАЙ технических индексов типа 'field_0', 'index: 3' — это непонятно человеку",
        "4. Если в данных есть 'field_name' — используй ЕГО как основное описание",
        
        "Структура отчета:",
        "1. 📋 Краткий обзор: цель, методика, общий результат",
        "2. 🔍 Найденные уязвимости: для каждой — ЧТО, ГДЕ, КАК воспроизвести",
        "   - Формат: 'На странице [URL] в поле [human_name] обнаружено отражение кода...'",
        "3. 🛡️ Рекомендации: конкретные шаги по исправлению для разработчиков",
        "4. 📊 Статистика: сколько протестировано, сколько уязвимо",
        
        "Тон отчета: профессиональный, но понятный не-техническим специалистам.",
        "Не используй жаргон без объяснений.",
        
        "🔧 ИНСТРУМЕНТ: Вызови save_report_to_disk(report_content='текст', filename='xss_report.md')"
    ],
    markdown=True
)