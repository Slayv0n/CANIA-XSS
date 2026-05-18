# utils/browser_manager.py
import html
import time
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
import re

def clean_payload(raw_payload: str) -> str:
    """
    Удаляет префиксы вида [TAG] из пейлоадов, полученных из RAG.
    Пример: "[WAF_BYPASS] <script>alert(1)</script>" → "<script>alert(1)</script>"
    """
    # Удаляем префикс [СЛОВА_ЦИФРЫ_ПОДЧЕРКИВАНИЯ] в начале строки
    cleaned = re.sub(r'^\[[A-Z0-9_]+\]\s*', '', raw_payload.strip())
    return cleaned
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
        try:
            soup = BeautifulSoup(self.page.content(), 'html.parser')
            inputs = []
            for idx, tag in enumerate(soup.find_all(['input', 'textarea'])):
                if tag.get('type') == 'hidden' or tag.get('hidden'):
                    continue
                    
                # Собираем label
                label = None
                if tag.get('id'):
                    lbl = soup.find('label', attrs={'for': tag.get('id')})
                    if lbl:
                        label = lbl.get_text(strip=True)
                
                # Формируем human_name
                human_name = (
                    label or 
                    tag.get('aria-label', '') or 
                    tag.get('placeholder', '') or 
                    tag.get('name', '') or 
                    tag.get('id', '') or 
                    f"field_{idx}"
                )
                
                inputs.append({
                    "index": idx,
                    "tag": tag.name,
                    "type": tag.get('type', 'text'),
                    "id": tag.get('id', ''),
                    "name": tag.get('name', ''),
                    "placeholder": tag.get('placeholder', ''),
                    "aria_label": tag.get('aria-label', ''),
                    "label": label,
                    "human_name": human_name,  # 🔥 КЛЮЧЕВОЕ
                    "url": self.page.url,       # 🔥 Для точной привязки
                    "required": tag.has_attr('required'),
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

    # utils/browser_manager.py — метод inject_payload (полная замена)
    def inject_payload(self, index: int, field_name: str, payload: str):
        """
        Вводит пейлоад и детектирует XSS через множественные методы.
        """
        self.findings = []
        
        # 🔥 Сохраняем исходное состояние для сравнения
        try:
            original_body = self.page.evaluate("() => document.body.innerHTML")
            original_scripts = self.page.evaluate(f"() => {{ window.__originalScripts = {original_scripts}; }}")
        except:
            original_body = ""
            original_scripts = 0
        
        clean_payload_str = clean_payload(payload)
        decoded_payload = html.unescape(clean_payload_str)
        print(f"   [🧹] Очищенный пейлоад: {decoded_payload[:60]}...")
        
        try:
            # 🔥 Надёжное получение элементов
            all_inputs = self.page.locator("input, textarea").all()
        except Exception as e:
            return f"ERROR: Playwright crash caught — {str(e)[:100]}"
        
        if index >= len(all_inputs):
            return f"Skipped (field {index} not found, total: {len(all_inputs)})"
        
        target = all_inputs[index]
        self._remove_blocking_overlays()
        
        try:
            target.scroll_into_view_if_needed(timeout=3000)
        except:
            pass
        
        print(f"   [⌨️] Ввожу в поле '{field_name}' (#{index}): {decoded_payload[:50]}...")
        
        # 🔥 Ввод с обработкой ошибок
        try:
            target.fill("", timeout=5000)
            target.type(decoded_payload, delay=30, timeout=15000)
        except Exception as e:
            error_str = str(e).lower()
            if any(kw in error_str for kw in ['closed', 'pipe', 'context', 'target closed']):
                try: self._reinitialize_context()
                except: pass
                return "ERROR: Playwright crash caught"
            return f"ERROR: Input failed: {str(e)[:100]}"
        
        # 🔥 Отправка формы (если возможно)
        try:
            target.press("Enter", timeout=5000)
        except:
            pass
        
        # 🔥 Ждём выполнения скрипта
        self.page.wait_for_timeout(2500)
        
        # 🔥 Метод 1: Перехват диалогов (с повторной проверкой)
        if self.findings:
            return f"🔴 {self.findings[0]}"
        
        # 🔥 Метод 2: Проверка через evaluate() — наличие признаков выполнения
        try:
            xss_detected = self.page.evaluate("""() => {
                // Признак 1: появился img с src=x
                if (document.querySelector('img[src="x"], img[src*="x:onerror"]')) return true;
                
                // Признак 2: body.innerHTML содержит alert или onerror
                const bodyHtml = document.body.innerHTML.toLowerCase();
                if (bodyHtml.includes('alert(') || bodyHtml.includes('onerror')) return true;
                
                // Признак 3: появилось больше скриптов
                if (document.querySelectorAll('script').length > window.__originalScripts) return true;
                
                // Признак 4: появился svg с onload
                if (document.querySelector('svg[onload], svg onload')) return true;
                
                return false;
            }""")
            if xss_detected:
                return "🔴 XSS_CONFIRMED: DOM manipulation detected"
        except Exception as e:
            print(f"   [⚠️] Ошибка проверки через evaluate: {e}")
        
        # 🔥 Метод 3: Сравнение body.innerHTML до/после
        try:
            new_body = self.page.evaluate("() => document.body.innerHTML")
            if original_body and new_body != original_body:
                # Проверяем, что изменение связано с нашим пейлоадом
                if any(keyword in new_body.lower() for keyword in ['alert', 'onerror', 'onload', 'src=x']):
                    return "🔴 XSS_CONFIRMED: Body content changed with suspicious code"
        except:
            pass
        
        # 🔥 Метод 4: Проверка отражения в источнике страницы
        try:
            page_source = self.page.content().lower()
            # Ищем не сам пейлоад, а его декодированные компоненты
            suspicious_patterns = ['<img', 'onerror=', 'alert(', 'src=x', 'onload=']
            if any(pattern in page_source for pattern in suspicious_patterns):
                return "🟡 Reflected: Suspicious pattern in page source"
        except:
            pass
        
        # 🔥 Метод 5: Проверка в URL (для отражённых атак)
        try:
            # Декодируем для сравнения
            decoded_for_url = decoded_payload.replace("'", "").replace('"', "").replace('<', '').replace('>', '')
            if decoded_for_url and decoded_for_url[:20] in self.page.url:
                return "🟡 Reflected in URL"
        except:
            pass
        
        return "⚪ Тихо (нет признаков выполнения)"

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