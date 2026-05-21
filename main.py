import os
import sys           # <--- ДОБАВИТЬ
import asyncio       # <--- ДОБАВИТЬ
import json
import time
import pika
import traceback
from datetime import datetime
from dotenv import load_dotenv
import requests

# === ФИКС ДЛЯ ОШИБКИ PLAYWRIGHT НА WINDOWS ===
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

# 1. ЗАСТАВЛЯЕМ ПИТОН ЧИТАТЬ НОВЫЙ .env!
load_dotenv(override=True)

from utils.spider import Spider
from utils.browser_manager import BrowserManager
from utils.log_sanitizer import sanitize_for_llm, safe_parse_json
from utils.pipeline_bridge import extract_osint_paths
from ai_agent_exploiter.ai_agent_exploiter import exploiter_agent
from ai_agent_reporter.ai_agent_reporter import reporter_agent
from ai_agent_terminal.ai_agent_terminal import agent_terminal
from ai_agent_scraper.ai_agent_scraper import parser_agent
from models.schemas import AttackResults

def safe_agent_run(agent, prompt: str):
    sanitized_prompt = sanitize_for_llm(prompt)
    try:
        res = agent.run(sanitized_prompt)
        return res.content if hasattr(res, 'content') else str(res)
    except Exception as e:
        print(f"[!] Agent fallback triggered: {e}")
        return "{}"

def orchestrator(target_url: str, task_id: str):
    print(f"\n🚀 ЗАПУСК ПОЛНОГО АУДИТА: {target_url} (Task ID: {task_id})")
    osint_data_content = "Данные OSINT отсутствуют."
    final_attack_results = []

    # --- ЭТАП 1: OSINT ---
    print("\n[1/5] Сбор сетевой информации (OSINT)...")
    try:
        osint_raw = agent_terminal.run(f"Просканируй инфраструктуру {target_url}")
        
        osint_raw_str = ""
        if osint_raw is None:
            print(" ⚠️  Агент вернул None — пропускаем OSINT")
            osint_raw_str = "Данные OSINT отсутствуют."
        elif hasattr(osint_raw, 'content'):
            osint_raw_str = osint_raw.content
        else:
            osint_raw_str = str(osint_raw)
        
        osint_paths = extract_osint_paths(osint_raw_str, target_url)
        if osint_paths:
            print(f"    ➕  Найдено путей из OSINT: {len(osint_paths)}")
        
        osint_data_content = "Данные OSINT отсутствуют."
        if osint_raw_str and osint_raw_str != "Данные OSINT отсутствуют.":
            try:
                osint_parsed = parser_agent.run(f"ЦЕЛЬ: {target_url}\nЛОГИ ДЛЯ ОБРАБОТКИ:\n{osint_raw_str}")
                osint_data_content = osint_parsed.content if hasattr(osint_parsed, 'content') else str(osint_parsed)
            except Exception as e:
                print(f" ⚠️  Парсинг OSINT пропущен: {e}")
        print(" ✅  OSINT завершен.")
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
        print(f"❌ Ошибка Паука: {repr(e)}")
        traceback.print_exc() # <--- ЭТО ВЫВЕДЕТ ПОЛНУЮ ОШИБКУ КРАСНЫМ ТЕКСТОМ
        return

    if not site_map:
        print("❌ Формы не найдены. Проверьте доступность.")
        return
    print(f"✅ Карта сайта: {len(site_map)} страниц")

    # --- ЭТАП 3: ПЛАНИРОВАНИЕ АТАК ---
    print("\n[3/5] Выбор стратегии атак (Exploiter)...")
    try:
        limited_site_map = {k: v for i, (k, v) in enumerate(site_map.items()) if i < 15}
        
        prompt = (
            f"Данные OSINT-разведки:\n{osint_data_content[:2000]}\n\n"
            f"Карта найденных форм (Site Map):\n{json.dumps(limited_site_map, ensure_ascii=False)}"
        )

        raw_exploit_output = safe_agent_run(exploiter_agent, prompt)
        
        # 1. Парсим то, что выдал ИИ
        exploit_json = safe_parse_json(raw_exploit_output, {"results": []})
        
        # --- СИСТЕМНЫЙ ФИКС: НОРМАЛИЗАЦИЯ JSON ---
        # Если ИИ вернул просто список [{}, {}], оборачиваем его в словарь
        if isinstance(exploit_json, list):
            exploit_json = {"results": exploit_json}
            
        # Если ИИ назвал ключ иначе (vulnerabilities, payloads, vectors), переименовываем его
        if "results" not in exploit_json:
            for possible_key in ["vulnerabilities", "payloads", "vectors", "attacks"]:
                if possible_key in exploit_json:
                    exploit_json["results"] = exploit_json[possible_key]
                    break
            # Если вообще ничего не нашли, делаем пустой список
            if "results" not in exploit_json:
                exploit_json["results"] = []
        # -----------------------------------------

        # Теперь Pydantic не упадет, так как ключ "results" 100% существует
        attack_data = AttackResults.model_validate(exploit_json)

        if not attack_data.results:
            print("⚠️ Векторы атак не найдены. Генерирую 'чистый' отчет...")
            report_prompt = (
                f"Цель: {target_url}\n"
                f"Результат: Уязвимостей не обнаружено.\n"
                "Напиши короткий отчет на русском языке, что сканирование проведено, "
                "но явных векторов XSS на найденных страницах не обнаружено."
            )
            safe_agent_run(reporter_agent, report_prompt)
            return

        print(f"✅ План сформирован. Векторов: {len(attack_data.results)}")

    except Exception as e:
        print(f"❌ Сбой планирования: {e}")
        # Если совсем всё упало — тоже шлем отчет об ошибке
        requests.put(f"http://localhost:8086/task/{task_id}/report", 
                     json={"reportContent": f"Ошибка при анализе сайта: {str(e)}"})
        return
    
    # --- ЭТАП 4: ИСПОЛНЕНИЕ ---
    print("\n[4/5] Выполнение инъекций (оптимизировано)...")
    try:
        browser = BrowserManager(headless=False)

        def find_url_for_field(site_map: dict, field_index: int) -> str:
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
            nav_result = browser.navigate(url)
            current_inputs = browser.get_page_inputs()

            for idx, vector in enumerate(vectors, 1):
                field_key = f"{url}_{vector.field_index}"
                if payloads_per_field.get(field_key, 0) >= 5:
                    vector.result = "Skipped (limit)"
                    final_attack_results.append(vector)
                    continue

                payloads_per_field[field_key] = payloads_per_field.get(field_key, 0) + 1

                if vector.field_index >= len(current_inputs):
                    vector.result = "Skipped (field not found)"
                    final_attack_results.append(vector)
                    continue

                result_msg = browser.inject_payload(vector.field_index, vector.field_name, vector.payload)

                if "XSS_CONFIRMED" in result_msg:
                    vector.result = "Success (Alert!)"
                elif "Reflected" in result_msg:
                    vector.result = "Reflected"
                elif "Playwright crash" in result_msg:
                    vector.result = "Error (Browser)"
                else:
                    vector.result = "Failed"

                final_attack_results.append(vector)
                time.sleep(0.5)

        browser.close()
    except Exception as e:
        print(f"❌ Ошибка во время выполнения инъекций: {repr(e)}")
        traceback.print_exc()
        return

    # --- ЭТАП 5: ОТЧЕТ ---
    print("\n[5/5] 📝 Генерация отчета...")
    try:
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
        print("✅ Отчет сгенерирован и отправлен на Бэкенд C#")
    except Exception as e:
        print(f"⚠️ Ошибка генерации отчета: {e}")

def process_rabbitmq_message(ch, method, properties, body):
    try:
        data = json.loads(body)
        message = data.get("message", {})
        
        task_id = message.get("id", str(message.get("Id")))
        host = message.get("host", str(message.get("Host")))
        
        if not task_id or not host:
            ch.basic_ack(delivery_tag=method.delivery_tag)
            return

        print(f"\n[RABBITMQ] Поймал задачу! ID: {task_id} | HOST: {host}")
        
        orchestrator(host, task_id)
        
        ch.basic_ack(delivery_tag=method.delivery_tag)
    except Exception as e:
        print(f"[!] Ошибка при обработке сообщения: {e}")
        traceback.print_exc()
        ch.basic_ack(delivery_tag=method.delivery_tag)

def start_worker():
    rabbitmq_host = os.getenv("RABBITMQ_HOST", "localhost")
    print(f"⏳ Подключение к RabbitMQ на {rabbitmq_host}...")
    
    try:
        connection = pika.BlockingConnection(pika.ConnectionParameters(
            host=rabbitmq_host, 
            heartbeat=0, 
            blocked_connection_timeout=300
        ))
        channel = connection.channel()
        
        queue_name = 'python-scanner-queue'
        channel.queue_declare(queue=queue_name, durable=True)
        
        exchange_name = 'SharedModels.Events.Tasks:TaskCreated'
        channel.exchange_declare(exchange=exchange_name, exchange_type='fanout', durable=True)
        channel.queue_bind(exchange=exchange_name, queue=queue_name)
        
        channel.basic_qos(prefetch_count=1)
        channel.basic_consume(queue=queue_name, on_message_callback=process_rabbitmq_message)
        
        print("🤖 [OK] AI Agent готов! Жду задачи от фронтенда (C#)... Нажми CTRL+C для выхода.")
        channel.start_consuming()
    except Exception as e:
        print(f"❌ Ошибка подключения к RabbitMQ: {e}")

if __name__ == "__main__":
    start_worker()