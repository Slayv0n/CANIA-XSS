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
        """Проверяет, является ли ссылка внутренней для домена"""
        base_domain = urlparse(base_url).netloc
        target_domain = urlparse(target_url).netloc
        return base_domain == target_domain or not target_domain

    def get_forms_from_page(self, page, url):
        """Извлекает все поля ввода со страницы"""
        content = page.content()
        soup = BeautifulSoup(content, 'html.parser')
        
        found_inputs = []
        # Ищем все input, textarea и select
        for idx, tag in enumerate(soup.find_all(['input', 'textarea', 'select'])):
            input_info = {
                "index": idx,
                "tag": tag.name,
                "type": tag.get('type', 'text'),
                "name": tag.get('name', 'N/A'),
                "id": tag.get('id', 'N/A'),
                "placeholder": tag.get('placeholder', 'N/A')
            }
            # Не берем скрытые поля (обычно это CSRF токены, их сложно атаковать в лоб)
            if input_info["type"] != "hidden":
                found_inputs.append(input_info)
        
        if found_inputs:
            self.site_map[url] = found_inputs
            print(f"  [+] Найдено полей: {len(found_inputs)}")

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
                    if depth < self.max_depth:
                        hrefs = page.eval_on_selector_all("a", "elements => elements.map(e => e.href)")
                        for href in hrefs:
                            full_url = urljoin(current_url, href).split('#')[0].rstrip('/')
                            if self.is_internal(start_url, full_url) and full_url not in self.visited_urls:
                                queue.append((full_url, depth + 1))
                                
                except Exception as e:
                    print(f"  [!] Ошибка на {current_url}: {str(e)[:100]}")

            browser.close()
        return self.site_map

# Тестовый запуск
if __name__ == "__main__":
    spider = Spider(max_depth=1)
    # Замени на URL своего локального проекта или любой тестовый сайт
    results = spider.crawl("http://zero.webappsecurity.com/")
    print("\n--- ИТОГ СКАНИРОВАНИЯ ---")
    print(json.dumps(results, indent=2, ensure_ascii=False))