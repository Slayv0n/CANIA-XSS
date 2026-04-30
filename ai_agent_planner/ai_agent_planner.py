from agno.agent import Agent
from utils.browser_manager import BrowserManager
from models.schemas import SiteMap

browser = BrowserManager()

def navigate_to_site(url: str):
    """Инструмент для перехода на сайт"""
    return browser.navigate(url)

def get_site_inputs():
    """Инструмент для извлечения всех полей ввода (инпутов)"""
    return browser.get_inputs()

planner_agent = Agent(
    name="Planner",
    role="Специалист по разведке и анализу структуры сайта",
    tools=[navigate_to_site, get_site_inputs],
    instructions=[
        "Твоя цель — исследовать сайт перед атакой.",
        "1. Перейди по указанному URL через 'navigate_to_site'.",
        "2. Собери все поля ввода на странице через 'get_site_inputs'.",
        "3. Определи стек технологий по структуре страницы (например, наличие признаков React, PHP, и т.д.).",
        "4. Верни структурированные данные согласно схеме SiteMap (url, tech_stack, inputs).",
        "ВАЖНО: tech_stack должен быть списком строк."
    ],
    output_schema=SiteMap,
    markdown=True
)