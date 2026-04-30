from agno.agent import Agent
from models.schemas import FinalReport
from pathlib import Path

def save_report_to_disk(report_content: str, filename: str):
    """Инструмент для сохранения итогового отчета в файл"""
    reports_dir = Path("reports")
    reports_dir.mkdir(exist_ok=True)
    file_path = reports_dir / filename
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(report_content)
    return f"Отчет сохранен: {file_path}"

reporter_agent = Agent(
    name="Reporter",
    role="Специалист по подготовке профессиональных отчетов о безопасности",
    tools=[save_report_to_disk],
    instructions=[
        "Твоя задача — собрать данные от Взломщика и подготовить финальный отчет.",
        "1. Структурируй все найденные уязвимости.",
        "2. Напиши подробные рекомендации (remediation steps) для программистов, как исправить эти XSS.",
        "3. Сформируй отчет по схеме FinalReport.",
        "4. Обязательно сохрани текстовую версию отчета на диск через 'save_report_to_disk'.",
    ],
    output_schema=FinalReport,
    markdown=True
)