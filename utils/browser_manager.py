import json
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup

class BrowserManager:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance.pw = sync_playwright().start()
            cls._instance.browser = cls._instance.browser = cls._instance.pw.chromium.launch(headless=False) # Поставь True для скрытого режима
            cls._instance.context = cls._instance.browser.new_context()
            cls._instance.page = cls._instance.context.new_page()
            cls._instance.findings = []
            # Ловим алерты (главный признак XSS)
            cls._instance.page.on("dialog", lambda d: [cls._instance.findings.append(f"XSS_CONFIRMED: {d.message}"), d.dismiss()])
        return cls._instance

    def navigate(self, url: str):
        self.page.goto(url, timeout=60000)
        return f"Успешно перешел на {url}. Можешь анализировать структуру."

    def get_inputs(self):
        """Извлекает все поля ввода для Планировщика"""
        soup = BeautifulSoup(self.page.content(), 'html.parser')
        inputs = []
        for idx, tag in enumerate(soup.find_all(['input', 'textarea'])):
            inputs.append({
                "index": idx,
                "tag": tag.name,
                "id": tag.get('id', 'N/A'),
                "name": tag.get('name', 'N/A'),
                "placeholder": tag.get('placeholder', 'N/A')
            })
        return json.dumps(inputs, ensure_ascii=False)

    def inject_payload(self, index: int, payload: str):
        """Вводит пейлоад в конкретное поле для Взломщика"""
        self.findings = [] # Очищаем логи перед атакой
        try:
            target = self.page.locator("input, textarea").nth(index)
            target.fill("")
            target.type(payload, delay=50)
            target.press("Enter")
            self.page.wait_for_timeout(2000)
            return f"Результат атаки на поле {index}: {self.findings if self.findings else 'Тихо (алертов нет)'}"
        except Exception as e:
            return f"Ошибка при вводе в поле {index}: {str(e)}"