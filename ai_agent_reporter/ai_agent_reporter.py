import os
import requests
from pathlib import Path
from dotenv import load_dotenv
from agno.agent import Agent
# from agno.models.ollama import Ollama
from agno.models.ollama import Ollama
from agno.models.deepseek import DeepSeek # Специальный импорт для официального API

load_dotenv()

# Мы стучимся напрямую в TaskService (порт 8086), минуя APIGateway, 
# потому что у питона нет JWT токена юзера, и Gateway нас отфутболит (401 Unauthorized)
TASK_API_URL = os.getenv("TASK_API_URL", "http://localhost:8086")

def save_report_to_disk(report_content: str, filename: str = "xss_audit_report.md") -> str:
    """Сохраняет отчет в Markdown-файл локально (для истории)"""
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
    """Отправляет готовый отчет обратно в C# микросервис и делает локальную копию"""
    
    # 1. Принудительное локальное сохранение
    try:
        reports_dir = Path("reports")
        reports_dir.mkdir(exist_ok=True)
        safe_domain = target_url.replace('https://', '').replace('http://', '').split('/')[0]
        file_path = reports_dir / f"report_{safe_domain}.md"
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(report_content)
        print(f"📁 Отчет также сохранен локально: {file_path}")
    except Exception as e:
        print(f"⚠️ Ошибка локального сохранения: {e}")

    # 2. Отправка на бэкенд
    try:
        url = f"{TASK_API_URL}/task/{task_id}/report"
        payload = {
            "reportContent": report_content
        }
        response = requests.put(url, json=payload)
        response.raise_for_status()
        return f"✅ Отчет успешно отправлен на C# Бэкенд!"
    except Exception as e:
        return f"❌ Ошибка отправки на бэкенд C#: {e}"

# model = OpenAIChat(
#     id=os.getenv("ID_MODEL", "google/gemini-flash-1.5"),
#     api_key=os.getenv("OPENROUTER_API_KEY"),
#     base_url="https://openrouter.ai/api/v1",
#     temperature=0.0,
#     timeout=120,
#     max_retries=3,
#     max_tokens=10000
# )

# model = Ollama(
#     id=os.getenv("ID_MODEL", "gemma4:e4b"), # Берет из .env, если не нашел - ставит gemma4
#     host="http://localhost:11434", # Стандартный порт Ollama
# )

model = DeepSeek(
    id=os.getenv("ID_MODEL", "deepseek-chat"),
    api_key=os.getenv("DEEPSEEK_API_KEY")
)

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
        "# 📋 Отчет по аудиту XSS",
        "## 🎯 Цель: {target_url}",
        "### 🔍 Краткий обзор",
        "### 🚨 Найденные уязвимости",
        "### 📊 Статистика",
        "### 🛡️ Общие рекомендации",
        "⚠️ ПРАВИЛА:",
        "- Не используй индексы типа 'поле #0' — только human_name",
        "- Если уязвимостей нет — честно напиши 'Уязвимостей не обнаружено'",
        "🔧 ДЕЙСТВИЯ:",
        "1. Сгенерируй отчет по шаблону выше",
        "2. Вызови save_report_to_disk(report_content=отчет) для локальной копии",
        "3. Вызови save_report_to_db(report_content=отчет, target_url=цель, task_id=уникальный_id) для базы",
        "4. Верни короткое подтверждение на русском"
    ],
    markdown=True
)