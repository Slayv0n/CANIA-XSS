import json
import logging
from urllib.parse import urljoin, urlparse, parse_qs
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)-5s | %(message)s")
logger = logging.getLogger(__name__)

ALLOWED_SCHEMES = {"http", "https", ""}
EXCLUDED_EXTENSIONS = {
    ".pdf", ".jpg", ".jpeg", ".png", ".gif", ".svg", ".ico", ".webp",
    ".zip", ".rar", ".tar", ".gz", ".exe", ".dmg", ".apk", ".iso",
    ".css", ".js", ".woff", ".woff2", ".ttf", ".eot", ".otf", ".map"
}
EXTERNAL_BLOCKLIST = {
    "github.com", "facebook.com", "twitter.com", "x.com", "linkedin.com",
    "instagram.com", "t.me", "telegram.me", "youtube.com", "youtu.be",
    "google.com", "microsoft.com", "apple.com", "reddit.com", "medium.com",
    "stackoverflow.com", "npmjs.com", "docker.com", "gitlab.com", "bitbucket.org"
}

class Spider:
    def __init__(self, max_depth: int = 2, max_pages: int = 50, user_agent: str = None):
        self.max_depth = max_depth
        self.max_pages = max_pages
        self.user_agent = user_agent or "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        self.visited_urls = set()
        self.processed_urls = set()
        self.site_map = {}
        self.base_domain = None
        self.base_scheme = None

    def _normalize_url(self, url: str, base_url: str) -> str | None:
        if not url or url.startswith(("javascript:", "data:", "mailto:", "tel:")):
            return None
        try:
            if url.startswith("//"): url = f"{self.base_scheme}:{url}"
            if not urlparse(url).netloc: url = urljoin(base_url, url)
            parsed = urlparse(url)
            if parsed.scheme not in ALLOWED_SCHEMES: return None
            fragment = parsed.fragment if parsed.netloc.lower() == self.base_domain else ""
            normalized = f"{parsed.scheme}://{parsed.netloc.lower()}{parsed.path}"
            if parsed.query: normalized += f"?{parsed.query}"
            if fragment: normalized += f"#{fragment}"
            return normalized.rstrip("/")
        except Exception:
            return None

    def is_allowed_url(self, target_url: str) -> bool:
        try:
            parsed = urlparse(target_url)
            target_domain = parsed.netloc.lower()
            if target_domain != self.base_domain: return False
            if any(b in target_domain for b in EXTERNAL_BLOCKLIST): return False
            if any(parsed.path.lower().endswith(ext) for ext in EXCLUDED_EXTENSIONS): return False
            
            query = parsed.query.lower()
            if any(p in query for p in ["to=", "url=", "next=", "redirect=", "return_to=", "dest=", "goto="]):
                params = parse_qs(parsed.query)
                for key in ["to", "url", "next", "redirect", "return_to", "dest", "goto"]:
                    if key in params and any("http" in v.lower() and self.base_domain not in v.lower() for v in params[key]):
                        return False
            
            github_patterns = ["/commit/", "/pulls", "/issues", "/actions", "/blob/", "/tree/", "/stargazers", "/watchers", "/forks"]
            if any(p in parsed.path.lower() for p in github_patterns): return False
            return True
        except Exception:
            return False

    def _wait_for_dynamic(self, page):
        try:
            page.wait_for_timeout(1500)
            for sel in ["input", "textarea", "button", "[role='button']", "[data-testid]", "router-outlet", "app-root", "#root"]:
                try:
                    if page.locator(sel).count(timeout=2000) > 0:
                        page.wait_for_timeout(300)
                        return True
                except: continue
            return True
        except: return True

    def _close_modals(self, page):
        for sel in ["button[aria-label*='Close']", "button[aria-label*='Dismiss']", "button:has-text('Close')", "button:has-text('Accept')", ".cookie-accept", "[class*='close']"]:
            try:
                for el in page.locator(sel).all()[:3]:
                    if el.is_visible(timeout=1000):
                        el.click(timeout=1000)
                        page.wait_for_timeout(200)
            except: continue

    def _extract_page_data(self, page, url):
        try:
            return page.evaluate("""() => {
                const links = new Set();
                document.querySelectorAll('a[href]').forEach(a => {
                    const h = a.getAttribute('href');
                    if (h && !h.startsWith('javascript:') && !h.startsWith('data:') && !h.startsWith('mailto:') && !h.startsWith('tel:')) links.add(h);
                });
                document.querySelectorAll('[routerLink]').forEach(el => {
                    const rl = el.getAttribute('routerLink');
                    if (rl) links.add(rl.startsWith('/') ? rl : '/' + rl);
                });
                document.querySelectorAll('a[href^="#"]').forEach(a => {
                    const h = a.getAttribute('href');
                    if (h && h.length > 1) links.add(h);
                });

                const fields = [];
                document.querySelectorAll('input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), [role="textbox"]').forEach((el, idx) => {
                    let labelText = '';
                    const forId = el.getAttribute('aria-labelledby') || el.getAttribute('id');
                    if (forId) { const lbl = document.querySelector(`label[for="${forId}"]`); if (lbl) labelText = lbl.innerText.trim(); }
                    fields.push({
                        index: idx, tag: el.tagName.toLowerCase(), type: el.type || 'text',
                        name: el.name || '', id: el.id || '', placeholder: el.placeholder || '',
                        aria_label: el.getAttribute('aria-label') || '',
                        human_name: (labelText || el.getAttribute('aria-label') || el.placeholder || el.name || el.id || `field_${idx}`).trim()
                    });
                });
                return { links: Array.from(links), fields };
            }""")
        except Exception as e:
            logger.warning(f"Extraction error: {e}")
            return {"links": [], "fields": []}

    def crawl(self, start_url: str) -> dict:
        parsed = urlparse(start_url)
        self.base_domain = parsed.netloc.lower()
        self.base_scheme = parsed.scheme or "https"
        logger.info(f"Spider started: {start_url} | Domain: {self.base_domain}")

        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True, args=["--disable-blink-features=AutomationControlled"])
            context = browser.new_context(user_agent=self.user_agent, viewport={"width": 1280, "height": 800}, ignore_https_errors=True)
            page = context.new_page()
            page.route("**/*.{png,jpg,jpeg,gif,svg,ico,woff,woff2,ttf,otf,map}", lambda r: r.abort())

            queue = [(start_url, 0)]
            self.visited_urls.add(start_url)
            stats = {"pages": 0, "fields": 0, "links": 0}

            while queue and stats["pages"] < self.max_pages:
                url, depth = queue.pop(0)
                if depth > self.max_depth or url in self.processed_urls: continue
                logger.info(f"[{depth}/{self.max_depth}] {url}")
                self.processed_urls.add(url)

                try:
                    page.goto(url, wait_until="domcontentloaded", timeout=20000)
                    self._wait_for_dynamic(page)
                    self._close_modals(page)

                    data = self._extract_page_data(page, url)
                    if data["fields"]:
                        for f in data["fields"]: f["url"] = url
                        self.site_map[url] = data["fields"]
                        stats["fields"] += len(data["fields"])
                        logger.info(f"Found {len(data['fields'])} fields")
                    stats["pages"] += 1

                    if depth < self.max_depth:
                        for href in data["links"]:
                            norm = self._normalize_url(href, url)
                            if norm and self.is_allowed_url(norm) and norm not in self.visited_urls:
                                self.visited_urls.add(norm)
                                queue.append((norm, depth + 1))
                                stats["links"] += 1
                except PlaywrightTimeout:
                    logger.warning(f"Timeout on {url}")
                except Exception as e:
                    logger.warning(f"Skipping {url}: {str(e)[:80]}")
            browser.close()

        logger.info(f"Scan complete. Visited: {stats['pages']} pages, Fields: {stats['fields']}")
        return self.site_map

    def get_summary(self) -> dict:
        return {
            "pages_scanned": len(self.site_map),
            "total_input_fields": sum(len(f) for f in self.site_map.values()),
            "urls": list(self.site_map.keys())
        }