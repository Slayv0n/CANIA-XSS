import os
import json
import time
import uuid
import traceback
from datetime import datetime
from dotenv import load_dotenv

from utils.spider import Spider
from utils.browser_manager import BrowserManager
from utils.log_sanitizer import sanitize_for_llm, safe_parse_json
from utils.pipeline_bridge import extract_osint_paths
from ai_agent_exploiter.ai_agent_exploiter import exploiter_agent
from ai_agent_reporter.ai_agent_reporter import reporter_agent
from ai_agent_terminal.ai_agent_terminal import agent_terminal
from ai_agent_scraper.ai_agent_scraper import parser_agent
from models.schemas import AttackResults

load_dotenv()

def safe_agent_run(agent, prompt: str):
    sanitized_prompt = sanitize_for_llm(prompt)
    try:
        res = agent.run(sanitized_prompt)
        return res.content if hasattr(res, 'content') else str(res)
    except Exception as e:
        print(f"[!] Agent fallback triggered: {e}")
        return "{}"

def orchestrator(target_url: str):
    print(f"\n🚀 ЗАПУСК ПОЛНОГО АУДИТА: {target_url}")
    osint_data_content = "Данные OSINT отсутствуют."
    final_attack_results = []

    # --- ЭТАП 1: OSINT ---
    print("\n[1/5] Сбор сетевой информации (OSINT)...")
    try:
        # 🔥 Безопасный вызов с проверкой на None
        osint_raw = agent_terminal.run(f"Просканируй инфраструктуру {target_url}")
        
        # Конвертация в строку для дальнейшей обработки
        osint_raw_str = ""
        if osint_raw is None:
            print(" ⚠️  Агент вернул None — пропускаем OSINT")
            osint_raw_str = "Данные OSINT отсутствуют."
        elif hasattr(osint_raw, 'content'):
            osint_raw_str = osint_raw.content
        else:
            osint_raw_str = str(osint_raw)
        
        # 🔥 Безопасное извлечение путей (защита от None)
        osint_paths = extract_osint_paths(osint_raw_str, target_url)
        if osint_paths:
            print(f"    ➕  Найдено путей из OSINT: {len(osint_paths)}")
        
        # Парсинг для отчета
        osint_data_content = "Данные OSINT отсутствуют."
        if osint_raw_str and osint_raw_str != "Данные OSINT отсутствуют.":
            try:
                osint_parsed = parser_agent.run(f"ЦЕЛЬ: {target_url}\nЛОГИ ДЛЯ ОБРАБОТКИ:\n{osint_raw_str}")
                osint_data_content = osint_parsed.content if hasattr(osint_parsed, 'content') else str(osint_parsed)
            except Exception as e:
                print(f" ⚠️  Парсинг OSINT пропущен: {e}")
        
        print(" ✅  OSINT  завершен .")
        
    except Exception as e:
        print(f" ⚠️  Шаг OSINT пропущен: {e}")
        osint_data_content = "Данные OSINT отсутствуют."
        osint_paths = []
        
    # --- ЭТАП 2: РАЗВЕДКА (ПАУК) ---
    print("\n[2/5] Запуск Паука (поиск форм + OSINT-пути)...")
    try:
        start_urls = {target_url}
        start_urls.update(osint_paths)

        site_map = {}
        spider = Spider(max_depth=3, max_pages=50)
        for url in list(start_urls):
            print(f"    🔍  Разведка пути: {url}")
            found = spider.crawl(url)
            if found:
                site_map.update(found)
    except Exception as e:
        print(f"❌ Ошибка Паука: {e}")
        return

    if not site_map:
        print("❌ Формы не найдены. Проверьте доступность.")
        return
    print(f"✅ Карта сайта: {len(site_map)} страниц")

    # --- ЭТАП 3: ПЛАНИРОВАНИЕ АТАК ---
    print("\n[3/5] Выбор стратегии атак (Exploiter)...")
    prompt = (
        f"Данные OSINT-разведки:\n{osint_data_content[:3000]}\n\n"
        f"Карта найденных форм (Site Map):\n{json.dumps(site_map, ensure_ascii=False)}"
    )

    try:
        raw_exploit_output = safe_agent_run(exploiter_agent, prompt)
        
        # 🔥 FIX: Agno с output_schema возвращает объект, а не JSON-строку
        if isinstance(raw_exploit_output, AttackResults):
            attack_data = raw_exploit_output
        else:
            exploit_json = safe_parse_json(raw_exploit_output, {"results": []})
            attack_data = AttackResults.model_validate(exploit_json)

        if not attack_data.results:
            print("⚠️ Агент не смог составить план атак (пустой results).")
            return

        print(f"✅ План сформирован. Векторов: {len(attack_data.results)}")
    except Exception as e:
        print(f"❌ Сбой на этапе планирования: {e}")
        return
    
    # --- ЭТАП 4: ИСПОЛНЕНИЕ ---
    print("\n[4/5] Выполнение инъекций (оптимизировано)...")
    browser = BrowserManager(headless=False)

    def find_url_for_field(site_map: dict, field_index: int) -> str:
        # Поиск URL по индексу поля (эвристика на основе данных Spider)
        for url, fields in site_map.items():
            if any(f.get("index") == field_index or idx == field_index for idx, f in enumerate(fields)):
                return url
        return list(site_map.keys())[0] if site_map else target_url

    attacks_by_url = {}
    for vector in attack_data.results:
        target_page = find_url_for_field(site_map, vector.field_index)
        attacks_by_url.setdefault(target_page, []).append(vector)

    print(f"📋 План атак: {len(attacks_by_url)} страниц, {len(attack_data.results)} векторов")

    payloads_per_field = {}
    for url, vectors in attacks_by_url.items():
        print(f"\n{'='*60}")
        print(f"🌐 СТРАНИЦА: {url}")
        print(f"📦 Векторов: {len(vectors)}")
        print('='*60)

        nav_result = browser.navigate(url)
        print(f"  {nav_result}")
        current_inputs = browser.get_page_inputs()
        print(f"  Найдено полей на странице: {len(current_inputs)}")

        for idx, vector in enumerate(vectors, 1):
            field_key = f"{url}_{vector.field_index}"
            if payloads_per_field.get(field_key, 0) >= 5:
                vector.result = "Skipped (limit)"
                final_attack_results.append(vector)
                continue

            payloads_per_field[field_key] = payloads_per_field.get(field_key, 0) + 1
            print(f"\n  [{idx}/{len(vectors)}] Поле #{vector.field_index}: {vector.payload[:40]}...")

            if vector.field_index >= len(current_inputs):
                vector.result = "Skipped (field not found)"
                final_attack_results.append(vector)
                continue

            result_msg = browser.inject_payload(vector.field_index, vector.field_name, vector.payload)

            if "XSS_CONFIRMED" in result_msg:
                vector.result = "Success (Alert!)"
                print("  🔴🔴🔴 XSS ОБНАРУЖЕНА! 🔴🔴🔴")
            elif "Reflected" in result_msg:
                vector.result = "Reflected"
            elif "Playwright crash" in result_msg:
                vector.result = "Error (Browser)"
            else:
                vector.result = "Failed"

            final_attack_results.append(vector)
            time.sleep(0.5)

    browser.close()

    # --- СТАТИСТИКА ---
    counts = {k: 0 for k in ["Success", "Reflected", "Failed", "Skipped", "Error"]}
    for v in final_attack_results:
        for k in counts:
            if k in v.result:
                counts[k] += 1

    print(f"\n📊 СТАТИСТИКА:")
    print(f"✅ Успешных XSS: {counts['Success']}")
    print(f"⚠️ Отражено: {counts['Reflected']}")
    print(f"❌ Неудачных: {counts['Failed']}")
    print(f"⚪ Пропущено: {counts['Skipped']}")
    print(f"💥 Ошибок: {counts['Error']}")
    print(f"📦 Всего: {len(final_attack_results)}")

    # --- ЭТАП 5: ОТЧЕТ ---
    print("\n[5/5] 📝 Генерация отчета...")
    try:
        task_id = f"scan_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6]}"
        safe_results = []
        for v in final_attack_results:
            safe_results.append({
                "field_index": v.field_index,
                "field_name": v.field_name,
                "payload": str(v.payload).replace('\\', '\\\\').replace('"', "'").replace('\n', ' '),
                "result": v.result,
                "url": getattr(v, 'url', 'unknown')
            })

        report_prompt = (
            f"🎯 Цель: {target_url}\n"
            f"🆔 Task ID: {task_id}\n"
            f"🕵️ OSINT: {osint_data_content[:2000]}\n"
            f"📋 Результаты тестов: {json.dumps(safe_results, ensure_ascii=False)}\n\n"
            "🔥 ТРЕБОВАНИЕ: Напиши ОТЧЕТ ПОЛНОСТЬЮ НА РУССКОМ ЯЗЫКЕ.\n"
            "Используй разделы: Краткий обзор, Найденные уязвимости, Статистика, Рекомендации.\n"
            "Сначала вызови save_report_to_disk(report_content=отчет).\n"
            f"Затем вызови save_report_to_db(report_content=отчет, target_url='{target_url}', task_id='{task_id}')."
        )
        safe_agent_run(reporter_agent, report_prompt)
        print("✅ Отчет сгенерирован и сохранен в /reports + MongoDB")
    except Exception as e:
        print(f"⚠️ Ошибка генерации отчета: {e}")

if __name__ == "__main__":
    print("-" * 60)
    print("🤖 AI XSS SCANNER (OSINT + RAG + PLAYWRIGHT)")
    print("-" * 60)
    target = input("🎯 Введите URL цели: ").strip()
    if target:
        orchestrator(target)