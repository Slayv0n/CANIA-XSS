import os
import json
import threading
import re # Добавлен импорт re для парсинга JSON
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor

# Импорт твоих модулей
from utils.spider import Spider
from utils.browser_manager import BrowserManager
from ai_agent_exploiter.ai_agent_exploiter import exploiter_agent
from ai_agent_reporter.ai_agent_reporter import reporter_agent

# Импорт агентов коллеги
from ai_agent_terminal.ai_agent_terminal import agent_terminal, agent_executor
from ai_agent_scraper.ai_agent_scraper import parser_agent

load_dotenv()

def run_spider_sync(url):
    """Обертка для запуска синхронного Паука в отдельном потоке"""
    spider = Spider(max_depth=1)
    return spider.crawl(url)

def orchestrator(target_url: str):
    print(f"\n🚀 ЗАПУСК ПОЛНОГО АУДИТА: {target_url}")


    osint_data = "Данные OSINT отсутствуют."
    final_attack_results = []

    # --- ЭТАП 1: OSINT (Временно закомментируй, если Docker не готов) ---
    try:
        print("\n[1/5] Сбор сетевой информации (OSINT)...")
        # Агенты теперь сами инициализируют свои модели
        osint_raw = agent_terminal.run(f"Просканируй инфраструктуру {target_url}")
        osint_data = parser_agent.run(osint_raw.content)
        print("✅ OSINT завершен.")
    except Exception as e:
        print(f"⚠️ Шаг OSINT пропущен: {e}")

    # --- ЭТАП 2: РАЗВЕДКА (Паук в потоке) ---
    print("\n[2/5] Запуск Паука (поиск форм)...")
    try:
        # Запускаем в отдельном потоке, чтобы не конфликтовать с asyncio
        with ThreadPoolExecutor() as executor:
            future = executor.submit(run_spider_sync, target_url)
            site_map = future.result()
    except Exception as e:
        print(f"❌ Ошибка Паука: {e}")
        return

    if not site_map:
        print("❌ Формы на сайте не найдены.")
        return
    print(f"✅ Карта сайта построена. Найдено страниц: {len(site_map)}")

# --- ЭТАП 3: ПЛАНИРОВАНИЕ АТАКИ (Exploiter + RAG) ---
    print("\n[3/5] Выбор стратегии атак (Exploiter)...")
    
    # Формируем промпт: передаем карту сайта
    prompt = f"Tech Stack: Web App\nSite Map: {json.dumps(site_map, ensure_ascii=False)}"

    try:
        # 1. Запускаем агента
        run_output = exploiter_agent.run(prompt)
        
        # 2. Извлекаем строгий Pydantic-объект (AttackResults)
        # Благодаря output_schema=AttackResults, здесь уже не строка, а объект
        attack_data = run_output.content if hasattr(run_output, 'content') else run_output
        
        # 3. Проверка
        if hasattr(attack_data, 'results') and attack_data.results:
            print(f"✅ План сформирован. Векторов: {len(attack_data.results)}")
            for v in attack_data.results:
                print(f"   • Поле #{v.field_index}: {v.payload[:40]}...")
        else:
            print("⚠️ Агент не смог составить план атак (пустой results).")
            return # Прерываем, если нет плана
            
    except Exception as e:
        print(f"❌ Сбой на этапе планирования: {e}")
        import traceback
        traceback.print_exc()
        return

    # --- ЭТАП 4: ИСПОЛНЕНИЕ (BrowserManager) ---
    print("\n[4/5] Запуск инъекций в браузере...")
    browser = BrowserManager() # Инициализируем синглтон
    
    # Проходим по каждому URL из карты сайта
    # Важно: BrowserManager навигирует внутри себя, но нам нужно сказать ему КУДА идти
    # Твой BrowserManager.navigate(url) делает goto.
    
    final_attack_results = []
    
    # Берем первый URL из site_map для атаки (или делай цикл, если сайт многостраничный)
    target_url_for_attack = list(site_map.keys())[0] 
    print(f"[*] Навигация к цели: {target_url_for_attack}")
    browser.navigate(target_url_for_attack)

    print("[*] Начинаю перебор векторов...")
    for vector in attack_data.results:
        try:
            print(f"   [*] Атака на поле #{vector.field_index} пейлоадом: {vector.payload[:30]}...")
            
            # ВЫЗОВ ТВОЕГО BROWSER MANAGER
            # inject_payload возвращает строку статуса
            result_msg = browser.inject_payload(vector.field_index, vector.payload)
            
            # Анализируем ответ
            status = "Failed"
            if "XSS_CONFIRMED" in result_msg:
                status = "Success (Alert!)"
                print(f"   🔴 КРИТИЧЕСКАЯ УЯЗВИМОСТЬ НАЙДЕНА!")
            elif "Тихо" not in result_msg: # Если не "Тихо" и не "Confirmed", значит что-то произошло
                status = "Reflected/Suspicious"
            
            # Обновляем объект результата (Pydantic модели позволяют менять атрибуты, если mutable)
            # Или просто сохраняем в список для репортера
            vector.result = status 
            final_attack_results.append(vector)
            
            # Небольшая пауза между атаками
            import time
            time.sleep(1) 
            
        except Exception as e:
            print(f"   [!] Ошибка при инъекции #{vector.field_index}: {e}")
            vector.result = "Error"
            final_attack_results.append(vector)

    # --- ЭТАП 5: ОТЧЕТ (Reporter) ---
    print("\n[5/5] Генерация отчета...")
    reporter_agent.run(
        f"Цель: {target_url}. OSINT: {osint_data}. Результаты атак: {final_attack_results}"
    )
    print("\n✨ АУДИТ ЗАВЕРШЕН. Проверь папку 'reports'.")

if __name__ == "__main__":
    target = input("URL: ").strip()
    if target:
        orchestrator(target)