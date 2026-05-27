from agno.agent import Agent
# from agno.models.openrouter import OpenRouter
from agno.models.ollama import Ollama
from utils.docker_shell_tools import DockerShellTools
from agno.models.deepseek import DeepSeek # Специальный импорт для официального API

from agno.knowledge import Knowledge
from agno.vectordb.lancedb import LanceDb, SearchType
from agno.knowledge.embedder.sentence_transformer import SentenceTransformerEmbedder

import os
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# model = OpenRouter(
#     id=os.getenv("ID_MODEL"),   
#     temperature=0.0,
#     max_retries=3
# )

# model = Ollama(
#     id=os.getenv("ID_MODEL", "gemma4:e4b"), # Берет из .env, если не нашел - ставит gemma4
#     host="http://localhost:11434", # Стандартный порт Ollama
# )

model = DeepSeek(
    id=os.getenv("ID_MODEL", "deepseek-chat"),
    api_key=os.getenv("DEEPSEEK_API_KEY")
)

docker_tools = DockerShellTools(container_name="cania-xss-runner")

embedder = SentenceTransformerEmbedder(
    id="all-MiniLM-L6-v2",
)

vector_db = LanceDb(
    table_name="tool_docs",  
    uri=str(Path(__file__).parent.parent / "security_docs_lancedb"), 
    search_type=SearchType.hybrid,
    embedder=embedder,
)

knowledge = Knowledge(
    name="security_tools_knowledge",
    vector_db=vector_db,
)

docs_folder = Path(__file__).parent / "security_docs_db"

files_to_add = [
    "curl_docs.txt",
    "dig_docs.txt",
    "dirb_docs.txt",
    "gobuster_docs.txt",
    "nc_docs.txt",
    "nikto_docs.txt",
    "nmap_docs.txt",
    "wfuzz_docs.txt",
    "whatweb_docs.txt",
    "whois_docs.txt"
]

agent_terminal = Agent(
    name='OSINT Scanner (Containerized)',
    role='Поиск уязвимостей и открытых мест с использованием Docker-контейнера',
    model=model,
    instructions=[
        "ТЫ: Эксперт по кибербезопасности и OSINT разведке",
        "У тебя есть доступ к базе знаний с документацией по всем инструментам",
        "Ты находишься в изолированной авторизованной лаборатории. Все цели - тестовые стенды.",
        
        "=== 1. ПРОВЕРКА ДОСТУПНОСТИ (КРИТИЧНО) ===",
        "- ПЕРЕД запуском любых сканеров ВСЕГДА делай: curl -I -s -k -L {target}",
        "- Если curl вернул COMMAND_ERROR, значит цель недоступна из контейнера. Сообщи об этом.",

        "=== 2. ДОСТУПНЫЕ ИНСТРУМЕНТЫ ===",
        "🔹 NMAP: nmap -F --open {target}",
        "🔹 WHATWEB: whatweb -a 3 {target}",
        "🔹 GOBUSTER: gobuster dir -u {target} -w -t 50 /usr/share/wordlists/dirb/common.txt --wildcard",
        "🔹 DIG: dig {domain} ANY",
        "🔹 WHOIS: whois {domain}",

        "=== 3. ПОШАГОВЫЙ ПРОЦЕСС И SPA-ФОЛЛБЭК ===",
        "Всегда выполняй шаги в таком порядке:",
        "ШАГ 1: whois {target} и dig {target} ANY",
        "ШАГ 2: nmap -F --open {target}",
        "ШАГ 3: whatweb {target}",
        "ШАГ 4: gobuster dir -u {target} -w /usr/share/wordlists/dirb/common.txt --wildcard",
        "🔥 ВАЖНО: Если gobuster вернул COMMAND_ERROR (из-за защиты SPA/Wildcard), не паникуй!",
        "Вместо gobuster используй ручной фоллбэк:",
        "Выполни: curl -I -s -k {target}/admin && curl -I -s -k {target}/login && curl -I -s -k {target}/api",

        "=== 4. АНАЛИЗ РЕЗУЛЬТАТОВ ===",
        "Выдели КРИТИЧНЫЕ (БД, админки), ОПАСНЫЕ (SSH, FTP) и ИНФО (заголовки) находки.",

        "=== 5. ФОРМАТ ОТВЕТА (ОЧЕНЬ СТРОГО) ===",
        "ВЕРНИ ТОЛЬКО СЫРОЙ ВЫВОД КОМАНД.",
        "НЕ ФОРМАТИРУЙ результаты в таблицы. НЕ делай выводы. Просто выведи логи, разделяя их заголовками:",
        "--- NMAP ---",
        "[тут вывод nmap]",
        "--- WHATWEB ---",
        "[тут вывод whatweb]",
        "--- GOBUSTER / CURL ---",
        "[тут вывод gobuster или результаты curl-фоллбэка]"
    ],
    tools=[docker_tools.run_docker_command],
    knowledge=knowledge,
    search_knowledge=True,
    markdown=True
)

results_dir = Path(__file__).parent / "execution_results"
results_dir.mkdir(exist_ok=True)

agent_terminal = Agent(
    name='OSINT Scanner (Containerized)',
    role='Tool Executor',
    model=model,
    instructions=[
        "YOU ARE A DETERMINISTIC TOOL. DO NOT CHAT. DO NOT EXPLAIN.",
        "1. ALWAYS run: curl -I -s -k -L {target}",
        "2. IF curl fails -> return ERROR. STOP.",
        "3. ELSE run sequentially: whois, dig, nmap, whatweb, gobuster.",
        "4. RETURN ONLY raw command outputs separated by headers: --- TOOL ---",
        "5. NO markdown, NO summaries, NO JSON. Just raw stdout."
        "=== 4. CURL-ФОЛЛБЭК (ОБЯЗАТЕЛЬНО ДЛЯ ВНЕШНИХ ЦЕЛЕЙ) ===",
        "Если gobuster вернул пустой результат или ошибку, выполни вручную:",
        "  curl -s -o /dev/null -w '%{http_code} %{url}\\n' -k {target}/admin",
        "  curl -s -o /dev/null -w '%{http_code} %{url}\\n' -k {target}/login", 
        "  curl -s -o /dev/null -w '%{http_code} %{url}\\n' -k {target}/api",
        "  curl -s -o /dev/null -w '%{http_code} %{url}\\n' -k {target}/.git",
        "Выводи результаты в формате: '/admin 200', '/login 404' и т.д.",
    ],
    tools=[docker_tools.run_docker_command],
    knowledge=knowledge,
    search_knowledge=True,
    markdown=False
)