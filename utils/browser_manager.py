# utils/browser_manager.py
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup

class BrowserManager:
    _instance = None

    def __new__(cls, headless=False):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance.pw = sync_playwright().start()
            cls._instance.browser = cls._instance.pw.chromium.launch(headless=headless)
            cls._instance.context = cls._instance.browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            )
            cls._instance.page = cls._instance.context.new_page()
            cls._instance.findings = []
            
            # Ловим алерты
            cls._instance.page.on("dialog", lambda d: [
                cls._instance.findings.append(f"XSS_CONFIRMED: {d.message}"), 
                d.dismiss()
            ])
        return cls._instance

    def navigate(self, url: str):
        try:
            self.page.goto(url, wait_until="domcontentloaded", timeout=60000)
            self.page.wait_for_timeout(3000)  # Ждем рендеринга
            
            # 🔥 УСИЛЕННОЕ закрытие модалок — пробуем несколько раз
            modal_selectors = [
                'button:has-text("Dismiss")',
                'button[aria-label="Close Welcome Banner"]',
                '.mat-close-button',
                'button.close-button'
            ]
            
            for selector in modal_selectors:
                try:
                    self.page.click(selector, timeout=2000)
                    print(f"   [✓] Закрыта модалка через: {selector}")
                    self.page.wait_for_timeout(500)
                    break
                except:
                    continue
            
            # Закрытие cookie banner
            try:
                self.page.click('button:has-text("Me want it!")', timeout=2000)
            except:
                pass
                
            return f"✅ Перешел на {url}"
        except Exception as e:
            return f"❌ Ошибка навигации: {e}"

    def get_page_inputs(self):
        """Получает все поля ввода на текущей странице"""
        try:
            soup = BeautifulSoup(self.page.content(), 'html.parser')
            inputs = []
            for idx, tag in enumerate(soup.find_all(['input', 'textarea'])):
                inputs.append({
                    "index": idx,
                    "tag": tag.name,
                    "type": tag.get('type', 'text'),
                    "id": tag.get('id', 'N/A'),
                    "name": tag.get('name', 'N/A'),
                    "placeholder": tag.get('placeholder', 'N/A')
                })
            return inputs
        except Exception as e:
            print(f"[!] Ошибка получения полей: {e}")
            return []

    def inject_payload(self, index: int, payload: str):
        """
        Вводит пейлоад в поле с ПОЛНОЙ защитой от падений.
        Никогда не выбрасывает исключения — всегда возвращает строку статуса.
        """
        self.findings = []
        
        try:
            # 🔍 Находим все поля
            all_inputs = self.page.locator("input, textarea").all()
            
            if index >= len(all_inputs):
                return f"ERROR: Поле #{index} не найдено (всего полей: {len(all_inputs)})"
            
            target = all_inputs[index]
            
            # ⏳ Ждем пока элемент станет видимым
            try:
                target.wait_for(state="visible", timeout=3000)
            except:
                return "ERROR: Поле недоступно или перекрыто"
            
            # 🧹 Очищаем поле
            try:
                target.fill("")
            except:
                return "ERROR: Не удалось очистить поле"
            
            # ⌨️ Вводим пейлоад
            try:
                target.type(payload, delay=30)
            except:
                return "ERROR: Не удалось ввести пейлоад"
            
            # 🚀 Отправляем форму
            try:
                target.press("Enter")
            except:
                return "ERROR: Не удалось отправить форму"
            
            # ⏱️ Ждем реакции страницы
            self.page.wait_for_timeout(1500)
            
            # ✅ Проверяем результаты
            if self.findings:
                return f"🔴 {self.findings[0]}"
            
            # Проверяем отражение в URL
            current_url = self.page.url
            payload_clean = payload.replace("'", "").replace('"', "")
            if payload_clean in current_url:
                return "🟡 Reflected in URL"
            
            # Проверяем контент страницы
            try:
                content = self.page.content()
                if "<script>" in content.lower() and "alert" in content.lower():
                    return "🟡 Reflected in HTML (возможно экранировано)"
            except:
                pass
            
            return "⚪ Тихо (нет алертов)"
            
        except Exception as e:
            # 🛡️ НИКОГДА не падаем — возвращаем ошибку строкой
            return f"ERROR: Неожиданная ошибка: {str(e)}"
        
        finally:
            # 🔁 Всегда ждем перед следующей атакой
            self.page.wait_for_timeout(1500)

    def close(self):
        """Закрытие браузера"""
        try:
            if hasattr(self, 'pw'):
                self.pw.stop()
        except:
            pass