import sys
from pathlib import Path
import subprocess

PROJECT_ROOT = Path(__file__).resolve().parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# ✅ Проверка контейнера ПЕРЕД импортом агентов
def check_docker():
    try:
        result = subprocess.run(
            ["docker", "ps", "--filter", "name=cania-xss-runner", "--format", "{{.Status}}"],
            capture_output=True, text=True, check=True
        )
        if "Up" in result.stdout:
            print("✅ Контейнер cania-xss-runner работает")
            return True
        else:
            print("❌ Контейнер cania-xss-runner НЕ запущен")
            print("💡 Запусти: docker start cania-xss-runner")
            return False
    except Exception as e:
        print(f"❌ Ошибка проверки Docker: {e}")
        return False

if not check_docker():
    sys.exit(1)

# ✅ Импорт агентов (только если контейнер ок)
from ai_agent_terminal.ai_agent_terminal import agent_terminal
from ai_agent_scraper.ai_agent_scraper import parser_agent

target = input("🎯 Цель для OSINT: ").strip() or "http://xss-game.appspot.com"
print(f"\n🔍 Запускаю сканирование: {target}")
print("-" * 50)

try:
    print("🔄 Выполняю agent_terminal.run()...")
    osint_raw = agent_terminal.run(f"Просканируй инфраструктуру {target}")
    
    # 🔥 Проверка на None
    if osint_raw is None:
        print("❌ agent_terminal.run() вернул None")
        print("💡 Возможные причины:")
        print("   1. Контейнер cania-xss-runner не отвечает")
        print("   2. Ошибка подключения к LanceDB (таблица tool_docs)")
        print("   3. Таймаут OpenRouter API")
        sys.exit(1)
    
    # Проверка на наличие .content
    if not hasattr(osint_raw, 'content'):
        print(f"❌ Объект не имеет атрибута .content: {type(osint_raw)}")
        print(f"💡 Сырой вывод: {osint_raw}")
        sys.exit(1)
    
    print(f"\n📡 Сырой вывод (первые 500 символов):\n{osint_raw.content[:500]}...")
    
    print(f"\n🧹 Парсинг результатов...")
    osint_data = parser_agent.run(osint_raw.content)
    print(f"\n📋 Структурированные данные:\n{osint_data.content}")
    
except Exception as e:
    print(f"\n❌ Ошибка: {e}")
    import traceback
    traceback.print_exc()