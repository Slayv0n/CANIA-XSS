import json
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse

class Spider:
    def __init__(self, max_depth=2):
        self.max_depth = max_depth
        self.visited_urls = set()
        self.site_map = {} # {url: [inputs]}

    def is_internal(self, base_url, target_url):
        """
        🔥 ЖЕСТКАЯ ПРОВЕРКА: разрешает только ссылки в пределах целевого домена
        """
        try:
            base_parsed = urlparse(base_url)
            target_parsed = urlparse(target_url)
            
            base_domain = base_parsed.netloc.lower()
            target_domain = target_parsed.netloc.lower()
            
            # 🔥 Разрешаем только если домены совпадают
            # (учитываем поддомены: app.example.com → example.com разрешено)
            if target_domain == base_domain:
                return True
            
            # 🔥 Разрешаем поддомены: blog.example.com → example.com
            if target_domain.endswith('.' + base_domain):
                return True
            
            # 🔥 Разрешаем относительные ссылки (без домена)
            if not target_domain:
                return True
            
            # ❌ Всё остальное — внешний домен, блокируем
            return False
            
        except Exception:
            # При ошибке парсинга — блокируем ссылку (безопаснее)
            return False

    def get_forms_from_page(self, page, url):
        """Извлекает текстовые поля с БОГАТЫМИ МЕТАДАННЫМИ для человеческого отчета"""
        content = page.content()
        soup = BeautifulSoup(content, 'html.parser')
        
        ALLOWED_INPUT_TYPES = {'text', 'search', 'email', 'password', 'url', 'tel', 'number', None, ''}
        found_inputs = []
        
        for idx, tag in enumerate(soup.find_all(['input', 'textarea'])):
            input_type = tag.get('type', '').lower().strip()
            if tag.name == 'input' and input_type not in ALLOWED_INPUT_TYPES:
                continue
            
            # 🔥 ИЗВЛЕКАЕМ ВИЗУАЛЬНЫЕ ПОДСКАЗКИ
            name = tag.get('name', '')
            field_id = tag.get('id', '')
            placeholder = tag.get('placeholder', '')
            aria_label = tag.get('aria-label', '')
            
            # 🔥 Ищем связанный <label> по атрибуту 'for'
            associated_label = ''
            if field_id:
                label_tag = soup.find('label', attrs={'for': field_id})
                if label_tag:
                    associated_label = label_tag.get_text(strip=True)
            
            # 🔥 Формируем человеко-понятное описание поля
            # Приоритет: label > aria-label > placeholder > name/id
            human_name = associated_label or aria_label or placeholder or name or field_id or f"field_{idx}"
            
            field_info = {
                "index": idx,
                "tag": tag.name,
                "type": input_type or 'text',
                "name": name,
                "id": field_id,
                "placeholder": placeholder,
                "aria_label": aria_label,
                "associated_label": associated_label,
                "human_name": human_name,  # 🔑 ГЛАВНОЕ: понятное имя
                "url": url  # 🔑 Сохраняем URL поля
            }
            
            found_inputs.append(field_info)
        
        if found_inputs:
            self.site_map[url] = found_inputs
            print(f"  [+] Найдено полей: {len(found_inputs)}")
        else:
            print(f"  [+] Полей для ввода текста не найдено")

    def crawl(self, start_url):
        print(f"[*] Запуск Паука на {start_url} (глубина: {self.max_depth})")
        
        with sync_playwright() as p:
            # Оставляем headless=False, чтобы ты видел успех
            browser = p.chromium.launch(headless=False) 
            context = browser.new_context(viewport={'width': 1280, 'height': 720})
            page = context.new_page()

            queue = [(start_url, 0)]
            
            while queue:
                current_url, depth = queue.pop(0)
                if current_url in self.visited_urls or depth > self.max_depth:
                    continue
                
                print(f"[*] Сканирую: {current_url} (ур. {depth})")
                self.visited_urls.add(current_url)

                try:
                    # Устанавливаем время ожидания на 60с, но ждем только загрузку DOM
                    page.goto(current_url, timeout=60000, wait_until="domcontentloaded")
                    
                    # Даем 3 секунды на отрисовку JS модалок
                    page.wait_for_timeout(3000) 

                    # --- АГРЕССИВНЫЙ ОБХОД ПРЕГРАД ---
                    # 1. Специфичный селектор для Juice Shop (ускоряет процесс)
                    try:
                        selectors = [
                            "button[aria-label='Close Welcome Banner']", 
                            "button:has-text('Dismiss')", 
                            "button:has-text('Me want it!')",
                            ".close-dialog"
                        ]
                        for selector in selectors:
                            if page.locator(selector).is_visible():
                                page.locator(selector).click()
                                print(f"  [+] Закрыта преграда через селектор: {selector}")
                                page.wait_for_timeout(500)
                    except: pass

                    # 2. Универсальный перебор (для других сайтов)
                    common_words = ["close", "dismiss", "accept", "ok", "понятно", "принять", "allow"]
                    for word in common_words:
                        try:
                            # Ищем только видимые кнопки
                            btn = page.get_by_role("button").filter(has_text=word).filter(visible=True).first
                            if btn.count() > 0:
                                btn.click()
                                print(f"  [+] Авто-клик по кнопке: '{word}'")
                                page.wait_for_timeout(500)
                        except: continue
                    # ---------------------------------

                    # Собираем формы
                    self.get_forms_from_page(page, current_url)
                    
                    # Сбор ссылок
                    # Сбор ссылок
                    if depth < self.max_depth:
                        hrefs = page.eval_on_selector_all("a", "elements => elements.map(e => e.href)")
                        for href in hrefs:
                            full_url = urljoin(current_url, href).split('#')[0].rstrip('/')
                            
                            # 🔥 ПРОВЕРКА ДОМЕНА ПЕРЕД ДОБАВЛЕНИЕМ В ОЧЕРЕДЬ
                            if not self.is_internal(start_url, full_url):
                                # Отладочный лог (можно закомментировать в продакшене)
                                # print(f"  [↗️] Пропущена внешняя ссылка: {full_url}")
                                continue
                            
                            if full_url not in self.visited_urls:
                                queue.append((full_url, depth + 1))

                except Exception as e:
                    print(f"  [!] Ошибка на {current_url}: {str(e)[:100]}")

            browser.close()
        return self.site_map

if __name__ == "__main__":
    spider = Spider(max_depth=1)
    results = spider.crawl("http://zero.webappsecurity.com/")
    print("\n--- ИТОГ СКАНИРОВАНИЯ ---")
    print(json.dumps(results, indent=2, ensure_ascii=False))