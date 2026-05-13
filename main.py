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
    # try:
    #     print("\n[1/5] Сбор сетевой информации (OSINT)...")
    #     # Агенты теперь сами инициализируют свои модели
    #     osint_raw = agent_terminal.run(f"Просканируй инфраструктуру {target_url}")
    #     osint_data = parser_agent.run(osint_raw.content)
    #     print("✅ OSINT завершен.")
    # except Exception as e:
    #     print(f"⚠️ Шаг OSINT пропущен: {e}")

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
    
    # Перезапускаем браузер если он завис
    try:
        browser.close()
    except:
        pass
    browser = BrowserManager(headless=False)
    
    # --- ЭТАП 4: ИСПОЛНЕНИЕ (Группировка по страницам) ---
    print("\n[4/5] 🎯 Выполнение инъекций (оптимизировано)...")
    browser = BrowserManager(headless=False)

    # 🔑 Определяем целевую URL (берем первую страницу из site_map)
    target_url_for_attack = list(site_map.keys())[0] if site_map else target_url
    print(f"🎯 Целевая страница: {target_url_for_attack}")
    # 🔑 ГРУППИРУЕМ векторы по URL
    # Создаем словарь: {url: [vector1, vector2, ...]}
    attacks_by_url = {}
    
    for vector in attack_data.results:
        # Пока у нас нет URL в векторах, берем первую страницу из site_map
        # В будущем Spider должен сохранять URL для каждого поля
        target_url = list(site_map.keys())[0] if site_map else target_url_for_attack
        
        if target_url not in attacks_by_url:
            attacks_by_url[target_url] = []
        attacks_by_url[target_url].append(vector)
    
    print(f"📋 План атак: {len(attacks_by_url)} страниц, {len(attack_data.results)} векторов")
    
    final_attack_results = []
    
    # 🔥 Проходим по каждой странице
    for url, vectors in attacks_by_url.items():
        print(f"\n{'='*60}")
        print(f"🌐 СТРАНИЦА: {url}")
        print(f"📦 Векторов для тестирования: {len(vectors)}")
        print('='*60)
        
        # 1. Переходим на страницу
        nav_result = browser.navigate(url)
        print(f"   {nav_result}")
        
        # 2. Проверяем, сколько полей на странице
        current_inputs = browser.get_page_inputs()
        print(f"   Найдено полей на странице: {len(current_inputs)}")
        
        # 3. Тестируем каждый вектор
        for idx, vector in enumerate(vectors, 1):
            print(f"\n   [{idx}/{len(vectors)}] Поле #{vector.field_index}: {vector.payload[:40]}...")
            
            # Переходим на страницу перед каждой атакой (чтобы сбросить состояние)
            if idx > 1:
                browser.navigate(url)
            
            # Выполняем инъекцию
            result_msg = browser.inject_payload(vector.field_index, vector.payload)
            
            # Определяем статус
            status = "Failed"
            if "XSS_CONFIRMED" in result_msg:
                status = "✅ Success (Alert!)"
                print(f"      🔴🔴 XSS ОБНАРУЖЕНА! 🔴🔴")
            elif "Reflected" in result_msg:
                status = "⚠️ Reflected"
            else:
                status = "❌ Failed"
            
            # Сохраняем результат
            vector.result = status
            final_attack_results.append(vector)
            
            # Небольшая пауза между атаками
            import time
            time.sleep(0.5)
    
    print(f"\n{'='*60}")
    print("✅ ВСЕ ИНЪЕКЦИИ ЗАВЕРШЕНЫ")
    print('='*60)

    # Подсчет статистики
    success_count = len([v for v in final_attack_results if "Success" in v.result])
    reflected_count = len([v for v in final_attack_results if "Reflected" in v.result])
    failed_count = len([v for v in final_attack_results if "Failed" in v.result])
    
    print(f"\n📊 СТАТИСТИКА:")
    print(f"   ✅ Успешных XSS: {success_count}")
    print(f"   ⚠️  Отражено: {reflected_count}")
    print(f"   ❌ Неудачных: {failed_count}")
    print(f"   📦 Всего: {len(final_attack_results)}")

       # --- ЭТАП 5: ОТЧЕТ (Reporter) ---
    print("\n[5/5] 📝 Генерация отчета...")
    try:
        # 🔑 САНТИЗИЗАЦИЯ: Очищаем данные от символов, ломающих JSON
        safe_results = []
        for v in final_attack_results:
            safe_results.append({
                "field_index": v.field_index,
                # Заменяем двойные кавычки и обратные слеши на безопасные аналоги
                "payload": v.payload.replace('"', "'").replace('\\', ''), 
                "result": v.result
            })

        report_prompt = (
            f"🎯 Цель: {target_url_for_attack}\n"
            f"📡 OSINT: {osint_data}\n"
            f" Результаты тестов: {json.dumps(safe_results, ensure_ascii=False)}\n\n"
            "ЗАДАЧА: Проанализируй данные и сохрани отчет через инструмент."
        )

        reporter_agent.run(report_prompt)
        print("✅ Отчет успешно сгенерирован и сохранен в папке /reports")
        
    except Exception as e:
        print(f"⚠️ Ошибка генерации отчета: {e}")
        print("💡 Данные аудита выведены в консоль. Отчет проп skipped.")

if __name__ == "__main__":
    target = input("URL: ").strip()
    if target:
        orchestrator(target)