# utils/browser_manager.py
import html
import time
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup

class BrowserManager:
    _instance = None

    def __new__(cls, headless=False):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            
            # 🔥 ЗАПУСКАЕМ PLAYWRIGHT
            cls._instance.pw = sync_playwright().start()
            
            # 🔑 headless=False — браузер должен быть ВИДИМ
            cls._instance.browser = cls._instance.pw.chromium.launch(
                headless=headless,
                args=['--disable-blink-features=AutomationControlled']  # Обход детекта ботов
            )
            
            cls._instance.context = cls._instance.browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                viewport={"width": 1280, "height": 800}
            )
            cls._instance.page = cls._instance.context.new_page()
            cls._instance.findings = []
            
            # Ловим алерты (главный признак успешной XSS)
            cls._instance.page.on("dialog", lambda d: [
                cls._instance.findings.append(f"XSS_CONFIRMED: {d.message}"), 
                d.dismiss()
            ])
            
            print(f"🌐 Браузер запущен (headless={headless})")
        return cls._instance

    def navigate(self, url: str):
        """Переход на страницу с усиленным закрытием модалок"""
        try:
            print(f"   [→] Переход на {url}...")
            self.page.goto(url, wait_until="domcontentloaded", timeout=60000)
            self.page.wait_for_timeout(2000)  # Ждем рендеринга JS
            
            # 🔥 УСИЛЕННОЕ закрытие модалок: 3 попытки с паузами
            modal_selectors = [
                'button:has-text("Dismiss")',
                'button[aria-label="Close Welcome Banner"]',
                '.mat-close-button',
                'button.close-button',
                'button:has-text("Close")'
            ]
            
            for attempt in range(3):
                for selector in modal_selectors:
                    try:
                        self.page.click(selector, timeout=1500)
                        print(f"   [✓] Закрыта модалка: {selector}")
                        self.page.wait_for_timeout(300)
                        break
                    except:
                        continue
                self.page.wait_for_timeout(500)
            
            # Закрытие cookie banner
            try:
                self.page.click('button:has-text("Me want it!")', timeout=2000)
            except:
                pass
                
            print(f"   ✅ Страница загружена")
            return f"✅ Перешел на {url}"
        except Exception as e:
            print(f"   ❌ Ошибка навигации: {e}")
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

    def _remove_blocking_overlays(self):
        """
        🔥 УНИВЕРСАЛЬНОЕ удаление блокирующих элементов:
        - Фиксированные/липкие элементы (fixed, sticky)
        - Элементы с высоким z-index (>100)
        - Куки-баннеры, поп-апы, оверлеи
        Работает на ЛЮБОМ сайте, не только Juice Shop
        """
        try:
            self.page.evaluate('''
                () => {
                    // 🔥 Универсальный алгоритм: находим и скрываем блокирующие элементы
                    document.querySelectorAll('*').forEach(el => {
                        try {
                            const style = window.getComputedStyle(el);
                            
                            // Критерии блокирующего элемента:
                            const isFixed = style.position === 'fixed';
                            const isSticky = style.position === 'sticky';
                            const isHighZIndex = parseInt(style.zIndex) > 100;
                            const isOverlay = el.classList && (
                                el.classList.toString().match(/modal|overlay|popup|cookie|banner|consent|gdpr/i)
                            );
                            
                            // Скрываем, если элемент подходит под критерии И виден
                            if ((isFixed || isSticky || isHighZIndex || isOverlay) && 
                                style.display !== 'none' && 
                                style.visibility !== 'hidden' &&
                                el.offsetParent !== null) {
                                
                                // Дополнительная проверка: элемент перекрывает центр экрана?
                                const rect = el.getBoundingClientRect();
                                const centerX = window.innerWidth / 2;
                                const centerY = window.innerHeight / 2;
                                
                                if (rect.left <= centerX && rect.right >= centerX &&
                                    rect.top <= centerY && rect.bottom >= centerY) {
                                    
                                    el.style.pointerEvents = 'none';
                                    el.style.display = 'none';
                                    el.style.visibility = 'hidden';
                                    el.style.opacity = '0';
                                }
                            }
                        } catch (e) {
                            // Игнорируем ошибки для отдельных элементов
                        }
                    });
                    
                    // 🔥 Дополнительная очистка: известные классы куки-баннеров
                    const commonBannerSelectors = [
                        '[id*="cookie"]', '[id*="consent"]', '[id*="gdpr"]',
                        '[class*="cookie"]', '[class*="consent"]', '[class*="gdpr"]',
                        '.modal', '.popup', '.overlay', '.lightbox',
                        '#cookie-banner', '#consent-banner', '#gdpr-banner'
                    ];
                    
                    commonBannerSelectors.forEach(selector => {
                        document.querySelectorAll(selector).forEach(el => {
                            try {
                                el.style.pointerEvents = 'none';
                                el.style.display = 'none';
                            } catch (e) {}
                        });
                    });
                }
            ''')
            # Небольшая пауза для применения стилей
            self.page.wait_for_timeout(100)
            
        except Exception as e:
            # Не критично, если не получится — просто продолжим работу
            print(f"   [⚠️] Не удалось убрать все оверлеи: {e}")

    def inject_payload(self, index: int, field_name: str, payload: str):
        """
        Вводит пейлоад. field_name используется только для логов и отчета.
        """
        self.findings = []
        
        try:
            decoded_payload = html.unescape(payload)
            
            try:
                all_inputs = self.page.locator("input, textarea").all()
            except Exception as e:
                return "ERROR: Playwright crash caught"
            
            if index >= len(all_inputs):
                return f"Skipped (field {index} not found)"
            
            target = all_inputs[index]
            self._remove_blocking_overlays()
            
            try:
                target.scroll_into_view_if_needed(timeout=3000)
            except:
                pass
            
            # 🔥 ЛОГИ С ИМЕНЕМ ПОЛЯ
            print(f"   [⌨️] Ввожу в поле '{field_name}' (#{index}): {decoded_payload[:40]}...")
            
            try:
                target.fill("", timeout=5000)
                target.type(decoded_payload, delay=50, timeout=10000)
            except Exception as e:
                error_str = str(e).lower()
                if any(kw in error_str for kw in ['closed', 'pipe', 'context', 'target closed']):
                    try: self._reinitialize_context()
                    except: pass
                    return "ERROR: Playwright crash caught"
                return f"ERROR: {str(e)}"
            
            try: target.press("Enter", timeout=5000)
            except: pass
            
            self.page.wait_for_timeout(2000)
            
            if self.findings:
                return f"🔴 {self.findings[0]}"
            
            try:
                if decoded_payload.replace("'", "").replace('"', "") in self.page.url:
                    return "🟡 Reflected in URL"
            except: pass
            
            try:
                if "<script>" in self.page.content().lower() and "alert" in self.page.content().lower():
                    return "🟡 Reflected in HTML"
            except: pass
            
            return "⚪ Тихо (нет алертов)"
            
        except Exception as e:
            error_str = str(e).lower()
            if 'closed' in error_str or 'pipe' in error_str or 'context' in error_str:
                try: self._reinitialize_context()
                except: pass
                return "ERROR: Playwright crash caught"
            return f"ERROR: {str(e)}"
        finally:
            self.page.wait_for_timeout(1000)

    def _reinitialize_context(self):
        """🔥 Переинициализация браузера при краше"""
        try:
            print("   [🔄] Переинициализация контекста...")
            # Закрываем старый контекст
            if hasattr(self, 'context'):
                self.context.close()
            # Создаем новый
            self.context = self.browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                viewport={"width": 1280, "height": 800}
            )
            self.page = self.context.new_page()
            self.findings = []
            self.page.on("dialog", lambda d: [
                self.findings.append(f"XSS_CONFIRMED: {d.message}"), 
                d.dismiss()
            ])
            print("   [✅] Контекст переинициализирован")
        except Exception as e:
            print(f"   [❌] Не удалось переинициализировать контекст: {e}")
            # Последняя попытка: полный рестарт Playwright
            try:
                if hasattr(self, 'pw'):
                    self.pw.stop()
                self.pw = sync_playwright().start()
                self.browser = self.pw.chromium.launch(
                    headless=False,
                    args=['--disable-blink-features=AutomationControlled']
                )
                self.context = self.browser.new_context(
                    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                    viewport={"width": 1280, "height": 800}
                )
                self.page = self.context.new_page()
                self.findings = []
                self.page.on("dialog", lambda d: [
                    self.findings.append(f"XSS_CONFIRMED: {d.message}"), 
                    d.dismiss()
                ])
                print("   [✅] Playwright полностью перезапущен")
            except Exception as e2:
                print(f"   [💥] Критический сбой перезапуска: {e2}")

    def close(self):
        """Закрытие браузера"""
        try:
            if hasattr(self, 'pw'):
                print("🔚 Браузер закрыт")
                self.pw.stop()
        except:
            pass