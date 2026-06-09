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
from pathlib import Path

# === ФИКС ДЛЯ ОШИБКИ PLAYWRIGHT НА WINDOWS ===
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

# 1. ЗАСТАВЛЯЕМ ПИТОН ЧИТАТЬ НОВЫЙ .env!
load_dotenv(override=True)
TASK_API_URL = os.getenv("TASK_API_URL", "http://localhost:8086")

from utils.spider import Spider
from utils.browser_manager import BrowserManager
from utils.log_sanitizer import sanitize_for_llm, safe_parse_json
from utils.pipeline_bridge import extract_osint_paths
from ai_agent_exploiter.ai_agent_exploiter import exploiter_agent
from ai_agent_reporter.ai_agent_reporter import reporter_agent
from ai_agent_terminal.ai_agent_terminal import agent_terminal
from ai_agent_scraper.ai_agent_scraper import parser_agent
from models.schemas import AttackResults

def filter_and_minimize_site_map(site_map: dict) -> dict:
    """
    Очищает карту сайта от нерелевантных полей и полностью исключает
    повторное сканирование одних и тех же сквозных форм (глобальный дедуп).
    """
    clean_map = {}
    allowed_types = {"text", "search", "textarea", "email", "url", "password"}
    
    # --- СИСТЕМНЫЙ ФИКС: ГЛОБАЛЬНЫЙ ФИЛЬТР ДУБЛИКАТОВ ---
    # Будем запоминать, какие уникальные поля мы уже встретили на сайте
    global_seen_fields = set() # Хранит кортежи вида (имя_поля, тип_поля)
    
    for url, fields in site_map.items():
        filtered_fields = []
        seen_on_page = set()
        
        for field in fields:
            f_type = field.get("type", "text").lower() if isinstance(field, dict) else getattr(field, "type", "text").lower()
            f_name = field.get("name", "") if isinstance(field, dict) else getattr(field, "name", "")
            f_idx = field.get("index", 0) if isinstance(field, dict) else getattr(field, "index", 0)
            f_placeholder = field.get("placeholder", "") if isinstance(field, dict) else getattr(field, "placeholder", "")
            
            if f_type not in allowed_types:
                continue
            
            # Убираем дубли на текущей странице
            if f_name and f_name in seen_on_page:
                continue
            
            # 🔥 ГЛОБАЛЬНАЯ ДЕДУПЛИКАЦИЯ:
            # Если поле с таким именем и типом мы уже тестировали на другой странице,
            # пропускаем его, чтобы не проверять сквозную форму входа 50 раз.
            global_key = (f_name, f_type)
            if f_name and global_key in global_seen_fields:
                continue
                
            if f_name:
                seen_on_page.add(f_name)
                global_seen_fields.add(global_key)
                
            filtered_fields.append({
                "index": f_idx,
                "type": f_type,
                "name": f_name,
                "placeholder": f_placeholder
            })
            
        if filtered_fields:
            filtered_fields.sort(key=lambda x: 0 if x["type"] in ["text", "search"] else 1)
            clean_map[url] = filtered_fields[:3]
            
    return clean_map

def sanitize_raw_osint_logs(raw_log: str) -> str:
    """
    Вырезает из гигантских сырых логов OSINT только полезные строки,
    сокращая объем передаваемого текста в ИИ на 90%.
    """
    if not raw_log:
        return "Данные отсутствуют."
        
    lines = raw_log.splitlines()
    useful_lines = []
    
    for line in lines:
        line_strip = line.strip()
        if not line_strip or line_strip.startswith(("+", "=", "-", "*")):
            continue
            
        # Оставляем только строки, содержащие ключевую информацию
        if any(kw in line_strip.lower() for kw in ["open", "port", "status: 200", "status: 301", "technology", "cms", "server:"]):
            useful_lines.append(line_strip)
            
    return "\n".join(useful_lines[:40]) # Ограничиваем до 40 самых важных строк

def safe_agent_run(agent, prompt: str):
    sanitized_prompt = sanitize_for_llm(prompt)
    try:
        res = agent.run(sanitized_prompt)
        return res.content if hasattr(res, 'content') else str(res)
    except Exception as e:
        print(f"[!] Agent fallback triggered: {e}")
        return "{}"
    
def send_report_to_backend_and_disk(report_text: str, target_url: str, task_id: str):
    """Гарантированно сохраняет файл на диск и шлет его на C# бэкенд"""
    # 1. Локальное сохранение на диск
    try:
        reports_dir = Path("reports")
        reports_dir.mkdir(exist_ok=True)
        safe_domain = target_url.replace('https://', '').replace('http://', '').split('/')[0]
        file_path = reports_dir / f"report_{safe_domain}_{task_id[:6]}.md"
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(report_text)
        print(f"📁 Отчет сохранен локально: {file_path}")
    except Exception as e:
        print(f"⚠️ Ошибка локального сохранения: {e}")

    # 2. Отправка в бэкенд C#
    try:
        # TASK_API_URL у тебя определен выше в файле
        url = f"{TASK_API_URL}/task/{task_id}/report"
        response = requests.put(url, json={"reportContent": report_text}, timeout=10)
        response.raise_for_status()
        print("✅ Отчет успешно отправлен на C# Бэкенд!")
    except Exception as e:
        print(f"❌ Ошибка отправки на бэкенд C#: {e}")

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
        if osint_raw_str and "Данные OSINT отсутствуют" not in osint_raw_str:
            try:
                # Очищаем логи от мусора перед отправкой в ИИ
                sanitized_osint = sanitize_raw_osint_logs(osint_raw_str)
                
                osint_parsed = parser_agent.run(f"ЦЕЛЬ: {target_url}\nЛОГИ:\n{sanitized_osint}")
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
        limited_site_map = filter_and_minimize_site_map(site_map)

        # Оставляем максимум первые 10 страниц для сканирования, чтобы сэкономить контекст
        limited_site_map = {k: v for i, (k, v) in enumerate(limited_site_map.items()) if i < 10}
        prompt = (
            f"Данные OSINT-разведки:\n{osint_data_content[:2000]}\n\n"
            f"Карта найденных форм (Site Map):\n{json.dumps(limited_site_map, ensure_ascii=False)}"
        )

        raw_exploit_output = safe_agent_run(exploiter_agent, prompt)
        
        # --- СИСТЕМНЫЙ ФИКС: ПРОВЕРЯЕМ ТИП ДАННЫХ ---
        # Если DeepSeek уже вернул готовый объект Pydantic (AttackResults)
        if isinstance(raw_exploit_output, AttackResults):
            print("🎯 DeepSeek успешно вернул нативный объект AttackResults.")
            attack_data = raw_exploit_output
        else:
            # 1. Парсим то, что выдал ИИ, если это строка
            exploit_json = safe_parse_json(raw_exploit_output, {"results": []})
            
            # --- СИСТЕМНЫЙ ФИКС: НОРМАЛИЗАЦИЯ JSON ---
            # Если ИИ вернул просто список [{}, {}], оборачиваем его в словарь
            if isinstance(exploit_json, list):
                exploit_json = {"results": exploit_json}
                
            # Если ИИ назвал ключ иначе, переименовываем его в "results"
            if "results" not in exploit_json:
                for possible_key in ["vulnerabilities", "payloads", "vectors", "attacks", "AttackResults"]:
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
        # Если совсем всё упало — тоже шлем отчет об ошибке напрямую в C#
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

    # --- ЭТАП 5: ОТЧЕТ (Гибридный подход без галлюцинаций) ---
    print("\n[5/5] 📝 Генерация отчета...")
    try:
        # 1. Выделяем только РЕАЛЬНО успешные атаки
        successful_attacks = [v for v in final_attack_results if "Success" in getattr(v, 'result', '')]
        
        # 2. Считаем статистику программно (на Python, без ИИ)
        total_tests = len(final_attack_results)
        success_count = len(successful_attacks)
        failed_count = sum(1 for v in final_attack_results if "Failed" in getattr(v, 'result', ''))
        skipped_count = sum(1 for v in final_attack_results if "Skipped" in getattr(v, 'result', ''))

        # 3. Просим ИИ написать только "Краткий обзор" и "Рекомендации" на основе РЕАЛЬНЫХ данных
        ai_prompt = (
            f"🎯 Цель: {target_url}\n"
            f"📊 Результаты тестирования: Проведено тестов: {total_tests}. Найдено XSS: {success_count}.\n"
            f"📋 Детали успешных уязвимостей (если есть): {json.dumps([{'field': v.field_name, 'payload': v.payload} for v in successful_attacks], ensure_ascii=False)}\n\n"
            "Напиши два раздела для отчета на русском языке:\n"
            "1. '🔍 Краткий обзор' (опиши методику сканирования и краткий вывод).\n"
            "2. '🛡️ Рекомендации по исправлению' (технические советы для разработчиков по защите от XSS).\n"
            "Пиши строго по делу, без выдумок."
        )
        ai_generated_text = safe_agent_run(reporter_agent, ai_prompt)

        # 4. Собираем итоговый Markdown программно (ИИ не сможет наврать в таблицах!)
        report_markdown = f"""
        # 📋 Отчет по аудиту безопасности XSS
        ## 🎯 Цель: {target_url}
        ## 🕐 Дата: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
        {ai_generated_text}
        ### 🚨 Найденные подтвержденные уязвимости
        """
        if success_count > 0:
            report_markdown += "| № | Страница | Поле ввода | Сработавший пейлоад | Статус |\n"
            report_markdown += "|---|----------|------------|---------------------|--------|\n"
            for idx, vuln in enumerate(successful_attacks, 1):
                url_path = getattr(vuln, 'url', target_url)
                report_markdown += f"| {idx} | {url_path} | {vuln.field_name} | `{vuln.payload}` | ✅ Подтверждено (Alert!) |\n"
        else:
            report_markdown += "\n**🔥 УЯЗВИМОСТЕЙ ТИПА XSS НА ДАННОМ РЕСУРСЕ НЕ ОБНАРУЖЕНО.**\n"

        report_markdown += f"""
        ### 📊 Статистика сканирования
        | Метрика | Значение |
        |---------|----------|
        | Всего протестировано полей | {total_tests} |
        | Успешных инъекций | {success_count} |
        | Неудачных попыток | {failed_count} |
        | Пропущено лимитом/ошибкой | {skipped_count} |
        """

        # 5. Гарантированно сохраняем и отправляем в C#
        send_report_to_backend_and_disk(report_markdown, target_url, task_id)
        print("✅ Гибридный отчет успешно сгенерирован и отправлен!")

    except Exception as e:
        print(f"⚠️ Ошибка финального отчета: {e}")
        traceback.print_exc()
        send_report_to_backend_and_disk(f"Ошибка при генерации отчета: {e}", target_url, task_id)

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