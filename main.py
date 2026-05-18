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
    spider = Spider(max_depth=2, max_pages=50)
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

 # --- ЭТАП 2: РАЗВЕДКА ---
    print("\n[2/5] Запуск Паука (поиск форм)...")
    try:
        with ThreadPoolExecutor() as executor:
            future = executor.submit(run_spider_sync, target_url)
            site_map = future.result()
    except Exception as e:
        print(f" ❌   Ошибка   Паука : {e}")
        return

    if not site_map:
        print(" ❌   Формы   на   сайте   не   найдены .  Проверьте   доступность   цели .")
        return
    print(f" ✅   Карта   сайта   построена .  Найдено   страниц : {len(site_map)}")
    
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
    
    # --- ЭТАП 4: ИСПОЛНЕНИЕ (Умная навигация по URL) ---
    print("\n[4/5] 🎯 Выполнение инъекций (оптимизировано)...")
    browser = BrowserManager(headless=False)
    
    # 🔑 Вспомогательная функция: находит URL для поля по индексу
    def find_url_for_field(site_map: dict, field_index: int) -> str:
        """Возвращает URL, на котором существует поле с данным индексом"""
        for url, fields in site_map.items():
            # Проверяем, есть ли поле с таким индексом на этой странице
            if any(idx == field_index for idx, _ in enumerate(fields)):
                return url
        # Fallback: первая страница из карты
        return list(site_map.keys())[0] if site_map else target_url

    # 🔑 ГРУППИРУЕМ векторы по целевому URL
    attacks_by_url = {}
    for vector in attack_data.results:
        target_url = find_url_for_field(site_map, vector.field_index)
        if target_url not in attacks_by_url:
            attacks_by_url[target_url] = []
        attacks_by_url[target_url].append(vector)
    
    print(f"📋 План атак: {len(attacks_by_url)} страниц, {len(attack_data.results)} векторов")
    
    final_attack_results = []
    current_url = None  # Отслеживаем, где сейчас браузер
    
    # 🔥 Проходим по каждой целевой странице
    for url, vectors in attacks_by_url.items():
        print(f"\n{'='*60}")
        print(f"🌐 СТРАНИЦА: {url}")
        print(f"📦 Векторов для тестирования: {len(vectors)}")
        print('='*60)
        
        # 1. Переходим на страницу (если еще не там)
        if current_url != url:
            nav_result = browser.navigate(url)
            print(f"   {nav_result}")
            current_url = url
        
        # 2. Получаем актуальные поля на странице
        current_inputs = browser.get_page_inputs()
        print(f"   Найдено полей на странице: {len(current_inputs)}")
        
        # 🔑 Счетчик пейлоадов на поле (для ЗАДАЧИ 3)
        payloads_per_field = {}
        
        # 3. Тестируем каждый вектор
        for idx, vector in enumerate(vectors, 1):
            # 🔑 ЗАДАЧА 3: Ограничение — максимум 5 пейлоадов на одно поле
            field_key = vector.field_index
            if field_key not in payloads_per_field:
                payloads_per_field[field_key] = 0
            
            if payloads_per_field[field_key] >= 5:
                print(f"   ⏭️  Пропуск: лимит 5 пейлоадов для поля #{field_key}")
                vector.result = "Skipped (limit)"
                final_attack_results.append(vector)
                continue
            
            payloads_per_field[field_key] += 1
            
            print(f"\n   [{idx}/{len(vectors)}] Поле #{vector.field_index}: {vector.payload[:40]}...")
            
            # 🔑 ЗАДАЧА 1: Гарантированный переход на правильный URL перед инъекцией
            if browser.page.url != url:
                print(f"   [🔄] Возврат на {url}...")
                browser.navigate(url)
                current_inputs = browser.get_page_inputs()  # Обновляем список полей
                current_url = url
            
            # Проверяем, существует ли поле с таким индексом на текущей странице
            if vector.field_index >= len(current_inputs):
                print(f"   ⚠️  Поле #{vector.field_index} не найдено (всего: {len(current_inputs)}), пропускаю")
                vector.result = "Skipped (field not found)"
                final_attack_results.append(vector)
                continue
            
            # 🔑 ЗАДАЧА 2: Выполнение инъекции с защитой от краша
            result_msg = browser.inject_payload(vector.field_index, vector.field_name, vector.payload)
            
            # Определяем статус
            if result_msg == "Skipped (field not found)":
                status = "Skipped"
                print(f"   ⚠️  Пропущено (поле не на этой странице)")
            elif "XSS_CONFIRMED" in result_msg:
                status = "✅ Success (Alert!)"
                print(f"      🔴🔴 XSS ОБНАРУЖЕНА! 🔴🔴")
            elif "Reflected" in result_msg:
                status = "⚠️ Reflected"
            elif "Playwright crash caught" in result_msg:
                status = "❌ Error (Playwright)"
                print(f"   [!] Перехват краша Playwright")
            else:
                status = "❌ Failed"
            
            vector.result = status
            final_attack_results.append(vector)
            
            # Пауза между атаками
            import time
            time.sleep(0.5)
    
    print(f"\n{'='*60}")
    print("✅ ВСЕ ИНЪЕКЦИИ ЗАВЕРШЕНЫ")
    print('='*60)

    # Подсчет статистики (добавляем новые статусы)
    success_count = len([v for v in final_attack_results if "Success" in v.result])
    reflected_count = len([v for v in final_attack_results if "Reflected" in v.result])
    failed_count = len([v for v in final_attack_results if "Failed" in v.result])
    skipped_count = len([v for v in final_attack_results if "Skipped" in v.result])
    error_count = len([v for v in final_attack_results if "Error" in v.result])
    
    print(f"\n📊 СТАТИСТИКА:")
    print(f"   ✅ Успешных XSS: {success_count}")
    print(f"   ⚠️  Отражено: {reflected_count}")
    print(f"   ❌ Неудачных: {failed_count}")
    print(f"   ⚪ Пропущено: {skipped_count}")
    print(f"   💥 Ошибок Playwright: {error_count}")
    print(f"   📦 Всего: {len(final_attack_results)}")

    # --- ЭТАП 5: ОТЧЕТ (Reporter) ---
    print("\n[5/5] 📝 Генерация отчета...")
    try:
        # 🔑 Определяем целевую URL для отчета
        report_target_url = list(attacks_by_url.keys())[0] if attacks_by_url else target_url
        
        # 🔑 САНТИЗИЗАЦИЯ: Очищаем пейлоады от символов, ломающих JSON
        safe_results = []
        for v in final_attack_results:
            safe_payload = (
                str(v.payload)
                .replace('\\', '\\\\')      # Экранируем слеши
                .replace('"', "'")           # Заменяем двойные кавычки на одинарные
                .replace('\n', ' ')          # Убираем переносы строк
                .replace('\r', '')           # Убираем возврат каретки
            )
                    # 🔥 ФОРМИРУЕМ ЧЕЛОВЕКО-ПОНЯТНЫЕ ОПИСАНИЯ ПОЛЕЙ
        safe_results = []
        for v in final_attack_results:
            # 🔑 Склеиваем атрибуты в одну строку
            field_desc_parts = []
            
            if hasattr(v, 'human_name') and v.human_name:
                field_desc_parts.append(f"Поле: {v.human_name}")
            elif hasattr(v, 'name') and v.name:
                field_desc_parts.append(f"name='{v.name}'")
            elif hasattr(v, 'id') and v.id:
                field_desc_parts.append(f"id='{v.id}'")
            else:
                field_desc_parts.append(f"поле #{v.field_index}")
            
            if hasattr(v, 'placeholder') and v.placeholder:
                field_desc_parts.append(f"(подсказка: '{v.placeholder[:30]}')")
            if hasattr(v, 'aria_label') and v.aria_label:
                field_desc_parts.append(f"(aria: '{v.aria_label[:30]}')")
            
            # 🔑 Добавляем URL страницы
            page_url = getattr(v, 'url', 'unknown')
            if page_url and page_url != 'unknown':
                # Обрезаем длинный URL для читаемости
                short_url = page_url.split('/')[-1] if '/' in page_url else page_url
                field_desc = f"Страница: {short_url} | {' '.join(field_desc_parts)}"
            else:
                field_desc = ' '.join(field_desc_parts)
            
            # Санитизация пейлоада (как было)
            safe_payload = (
                str(v.payload)
                .replace('\\', '\\\\')
                .replace('"', "'")
                .replace('\n', ' ')
                .replace('\r', '')
            )
            
            safe_results.append({
                "field_index": v.field_index,
                "field_name": field_desc,  # 🔑 ЧЕЛОВЕКО-ПОНЯТНОЕ ИМЯ
                "payload": safe_payload,
                "result": v.result,
                "url": getattr(v, 'url', '')  # Сохраняем URL отдельно для точности
            })

        report_prompt = (
            f"🎯 Цель: {report_target_url}\n"
            f"📡 OSINT: {osint_data}\n"
            f"📋 Результаты тестов: {json.dumps(safe_results, ensure_ascii=False)}\n\n"
            "🔥 ТРЕБОВАНИЕ: Напиши ОТЧЕТ ПОЛНОСТЬЮ НА РУССКОМ ЯЗЫКЕ.\n"
            "Используй разделы: Краткий обзор, Найденные уязвимости, Рекомендации.\n"
            "Сохраните отчет через инструмент save_report_to_disk."
        )

        reporter_agent.run(report_prompt)
        print("✅ Отчет успешно сгенерирован и сохранен в папке /reports")
        
    except Exception as e:
        print(f"⚠️  Ошибка генерации отчета: {e}")
        print("💡 Данные аудита выведены в консоль. Отчет пропущен.")
        
if __name__ == "__main__":
    target = input("URL: ").strip()
    if target:
        orchestrator(target)