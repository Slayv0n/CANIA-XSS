 # ai_agent_reporter/ai_agent_reporter.py
from pathlib import Path
from agno.agent import Agent
from agno.tools import Toolkit
from agno.utils.log import logger

class ReporterToolkit(Toolkit):
    """Toolkit для сохранения итоговых отчетов о пентесте"""
    
    def __init__(self, output_dir: str = "reports", **kwargs):
        super().__init__(name="reporter_toolkit")
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.register(self.save_final_report)

    def save_final_report(self, target_name: str, markdown_content: str) -> str:
        """
        Сохраняет сгенерированный Markdown отчет в файл.
        
        Args:
            target_name (str): Название цели (например, testphp.vulnweb.com)
            markdown_content (str): Готовый текст отчета в формате Markdown
        """
        logger.info(f"📝 Сохранение отчета для {target_name}")
        
        clean_name = target_name.replace("http://", "").replace("https://", "")
        clean_name = clean_name.replace("/", "_").replace(":", "_").replace("?", "_").replace("=", "_")
        filename = f"XSS_Audit_Report_{clean_name}.md"
        filepath = self.output_dir / filename
        
        try:
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(markdown_content)
            return f"✅ Отчет успешно сохранен по пути: {filepath.absolute()}"
        except Exception as e:
            logger.error(f"❌ Ошибка сохранения отчета: {e}")
            return f"Ошибка при сохранении файла: {str(e)}"

reporter_agent = Agent(
    name="Security Reporter",
    role="Формирование профессиональных ИБ-отчетов",
    tools=[ReporterToolkit()],
    instructions=[
        "ТЫ: Генератор отчетов.",
        "Даже если данных от других агентов нет или они содержат ошибки, сформируй отчет о том, что была попытка сканирования и она завершилась неудачно. Обязательно вызови save_final_report."
        "1. Прочитай данные от Взломщика.",
        "2. Вызови 'save_final_report' и сохрани Markdown файл.",
        "НИКОГДА не выдумывай URL (никаких example_target.com). Если URL нет, используй 'Unknown Target'."
        "3. Отчет должен быть не в виде логов или JSON-файла"
        "4. Отчет должен быть понятен любому, даже плохо знакомому с информационной безопасностью человеку"
    ],
    markdown=True,
    debug_mode=False
)
