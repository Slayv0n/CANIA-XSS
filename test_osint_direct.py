#!/usr/bin/env python3
# test_osint_direct.py — прямой тест OSINT-инфраструктуры (без LLM)

import subprocess
import sys

CONTAINER = "cania-xss-runner"
WORDLIST = "/usr/share/wordlists/dirb/common.txt"

# ============================================================
# ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
# ============================================================

def run(cmd: list[str], timeout: int = 60) -> str:
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, check=True)
        return result.stdout.strip()
    except subprocess.TimeoutExpired:
        return f"⏱ Таймаут ({timeout}с): {' '.join(cmd)}"
    except subprocess.CalledProcessError as e:
        return e.stderr.strip() if e.stderr else f"Ошибка: {e}"
    except FileNotFoundError:
        return "❌ Docker не найден. Установи Docker Desktop."
    except Exception as e:
        return f"❌ {type(e).__name__}: {e}"

def docker_exec(command: str) -> str:
    return run(["docker", "exec", CONTAINER, "bash", "-c", command])

def check_container() -> bool:
    out = run(["docker", "ps", "--filter", f"name={CONTAINER}", "--format", "{{.Status}}"])
    if "Up" in out:
        print(f"✅ Контейнер '{CONTAINER}' работает")
        return True
    print(f"❌ Контейнер '{CONTAINER}' не запущен")
    print(f"💡 Запусти: docker start {CONTAINER}")
    return False

# ============================================================
# ОСНОВНАЯ ЛОГИКА
# ============================================================

def main():
    print("🔧 CANIA-XSS — Прямой тест OSINT-инфраструктуры")
    print("=" * 60)
    
    if not check_container():
        sys.exit(1)
    
    target = input("\n🎯 Цель (домен или URL): ").strip()
    if not target:
        target = "http://xss-game.appspot.com"
    
    domain = target.split("//")[-1].split("/")[0].split(":")[0] if "://" in target else target.split("/")[0]
    print(f"\n🔍 Сканирую: {target} (домен: {domain})\n")
    
    # 1. WHOIS
    print("📋 whois...")
    whois_out = docker_exec(f"whois {domain} 2>&1 | head -20")
    print(whois_out if whois_out else "   (нет данных или приватный WHOIS)")
    
    # 2. NMAP
    print("\n🔓 nmap -Pn -F --open...")
    nmap_out = docker_exec(f"nmap -Pn -F --open {domain}")
    print(nmap_out[:400] + "..." if len(nmap_out) > 400 else nmap_out)
    
    # 3. WHATWEB
    print("\n🛠 whatweb...")
    whatweb_out = docker_exec(f"whatweb -a 3 {target} 2>&1")
    print(whatweb_out[:400] + "..." if len(whatweb_out) > 400 else whatweb_out)
    
    # 4. GOBUSTER + CURL-FALLBACK
    print(f"\n📁 Поиск путей (gobuster + curl-фоллбэк)...")
    
    # Мини-вордлист для быстрого теста
    mini_wordlist = "/tmp/mini.txt"
    docker_exec(f"echo -e '/search\\n/login\\n/admin\\n/api\\n/robots.txt\\n/level1' > {mini_wordlist}")
    
    found = []
    
    # Пробуем gobuster
    gobuster_cmd = f'gobuster dir -u "{target}" -w {mini_wordlist} -t 2 --timeout 3s -q -k --no-progress --no-color 2>&1'
    gobuster_raw = docker_exec(gobuster_cmd)
    
    # Парсим вывод gobuster
    if "Error" not in gobuster_raw and "wildcard" not in gobuster_raw.lower():
        for line in gobuster_raw.split("\n"):
            line = line.strip()
            if line and "Status:" in line and "Progress:" not in line:
                parts = line.split()
                if parts:
                    path = parts[0] if parts[0].startswith("/") else "/" + parts[0]
                    status_part = line.split("Status:")[1].strip()[:15] if "Status:" in line else ""
                    found.append(f"{path} {status_part}")
    
    # 🔥 CURL-фоллбэк если gobuster не сработал
    if not found:
        print("   🔁 gobuster не справился, пробуем curl-фоллбэк...")
        paths = ["/search", "/login", "/admin", "/api", "/robots.txt", "/level1", "/.git", "/favicon.ico"]
        for p in paths:
            try:
                code = docker_exec(
                    f"curl -s -o /dev/null -w '%{{http_code}}' -k --connect-timeout 2 --max-time 3 '{target}{p}' 2>/dev/null"
                ).strip()
                if code and code.isdigit() and code in ["200", "301", "302", "401", "403", "500"]:
                    found.append(f"{p} (Status: {code})")
            except:
                continue
    
    # Вывод результата
    if found:
        print("   Найдено:")
        for f in found[:10]:
            print(f"   {f}")
    else:
        print("   ⚠️  Ничего не найдено (или цель блокирует сканирование)")
    
    print("\n✅ Инфраструктура работает. Команды выполняются в контейнере.")
    print("💡 Для интеграции: агент должен вызывать docker_exec() через DockerShellTools")

if __name__ == "__main__":
    main()