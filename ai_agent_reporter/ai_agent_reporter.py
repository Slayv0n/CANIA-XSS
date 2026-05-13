# ai_agent_reporter/ai_agent_reporter.py
import os
from dotenv import load_dotenv
from agno.agent import Agent
from agno.models.openai import OpenAIChat
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
    """Инструмент: сохранение отчета в папку reports/"""
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
        "Ты генерируешь краткий отчет по результатам XSS-аудита.",
        "1. Проанализируй входные данные (цель, результаты тестов).",
        "2. Составь Markdown-отчет с разделами: Summary, Findings, Recommendations.",
        "3. НЕ используй сложные таблицы или код с кавычками. Пиши простым текстом.",
        "4. ВЫЗОВИ ИНСТРУМЕНТ save_report_to_disk с полным текстом отчета.",
        "5. После сохранения верни короткое подтверждение."
    ],
    markdown=True
)