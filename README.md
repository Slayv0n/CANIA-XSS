# CANIA-XSS
Архитектура

Проект состоит из пяти основных этапов:

    OSINT-разведка — сбор информации о цели (порты, технологии, директории)
    Spider — обход сайта и поиск полей ввода
    Exploiter — планирование атак на основе найденных технологий
    BrowserManager — выполнение инъекций и детектирование XSS
    Reporter — генерация отчета в Markdown и сохранение в MongoDB

Структура проекта

ai-agents/
├── main.py                          # Точка входа, оркестрация всего пайплайна
├── init_lancedb.py                  # Инициализация векторной базы данных
├── requirements.txt                 # Python-зависимости
├── setup.bat                        # Скрипт автоматической установки (Windows)
├── docker-compose.yml               # Конфигурация Docker-контейнеров
├── .env.example                     # Шаблон переменных окружения
├── README.md                        # Этот файл
│
├── models/
│   ├── __init__.py
│   └── schemas.py                   # Pydantic-схемы данных (валидация)
│
├── utils/
│   ├── __init__.py
│   ├── spider.py                    # Web-crawler на Playwright
│   ├── browser_manager.py           # Управление браузером, инъекции, детект XSS
│   ├── rag_engine.py                # RAG-движок для поиска пейлоадов
│   ├── docker_shell_tools.py        # Выполнение команд в Docker-контейнере
│   ├── log_sanitizer.py             # Очистка логов для безопасной передачи в LLM
│   └── pipeline_bridge.py           # Мост между OSINT и Spider (извлечение путей)
│
├── ai_agent_terminal/               # Агент OSINT-разведки
│   ├── __init__.py
│   ├── ai_agent_terminal.py         # Основной агент (nmap, whatweb, gobuster)
│   └── security_docs_db/            # Документация по инструментам
│       ├── tool_documentation/      # Документация: curl, nmap, whatweb и т.д.
│       └── xss_payloads/            # База XSS-пейлоадов (generic, angular, react...)
│
├── ai_agent_scraper/                # Агент парсинга
│   ├── __init__.py
│   └── ai_agent_scraper.py          # Парсинг сырых логов в JSON
│
├── ai_agent_exploiter/              # Агент планирования атак
│   ├── __init__.py
│   └── ai_agent_exploiter.py        # Выбор пейлоадов через RAG
│
├── ai_agent_reporter/               # Агент генерации отчетов
│   ├── __init__.py
│   └── ai_agent_reporter.py         # Создание Markdown-отчетов, сохранение в MongoDB
│
├── docker/
│   └── osint-runner/
│       ├── Dockerfile               # Образ Kali Linux с инструментами OSINT
│       └── .dockerignore            # Исключения для Docker
│
└── security_docs_lancedb/           # Векторная база данных (генерируется автоматически)


Описание файлов

Корневые файлы
main.py
Главный файл проекта. Содержит функцию orchestrator(), которая последовательно запускает все этапы сканирования:

    Вызывает OSINT-агента для сбора информации
    Запускает Spider для обхода сайта
    Передает данные Exploiter для планирования атак
    Выполняет инъекции через BrowserManager
    Генерирует отчет через Reporter

init_lancedb.py
Скрипт инициализации векторной базы данных LanceDB. Читает XSS-пейлоады из папки ai_agent_terminal/security_docs_db/xss_payloads/, создает эмбеддинги и сохраняет в базу для быстрого поиска через RAG. Запускается один раз перед первым использованием.
requirements.txt
Список Python-зависимостей проекта. Устанавливается командой pip install -r requirements.txt.
setup.bat
Автоматический скрипт установки для Windows. Создает виртуальное окружение, устанавливает зависимости, загружает браузер Playwright.
docker-compose.yml
Конфигурация Docker-контейнеров:

    mongodb — база данных MongoDB для хранения отчетов
    osint-runner — контейнер на базе Kali Linux с инструментами (nmap, gobuster, whatweb, whois)

Модели данных (models/)
schemas.py
Содержит Pydantic-схемы для валидации данных:

    InputField — описание поля ввода (тип, имя, placeholder)
    SiteMap — карта сайта со списком полей
    AttackVector — вектор атаки (пейлоад, результат, URL)
    AttackResults — список всех проведенных атак
    FinalReport — финальный отчет

Утилиты (utils/)
spider.py
Web-crawler на базе Playwright. Обходит сайт, игнорируя внешние домены и статические файлы. Извлекает:

    Все ссылки для дальнейшего обхода
    Поля ввода (input, textarea) с метаданными (label, placeholder, aria-label)
    Поддерживает SPA (Single Page Applications) через ожидание динамического контента

browser_manager.py
Singleton для управления браузером. Отвечает за:

    Навигацию по страницам
    Закрытие модальных окон и cookie-баннеров
    Ввод пейлоадов в поля
    Детектирование XSS через 5 методов:
        Перехват alert/dialog
        Проверка DOM на наличие опасных элементов
        Сравнение innerHTML до/после
        Поиск маркера в исходном коде страницы
        Проверка URL на отражение
    Переинициализацию контекста при крашах Playwright

rag_engine.py
RAG (Retrieval-Augmented Generation) движок. Использует векторную базу LanceDB для поиска релевантных XSS-пейлоадов по технологическому стеку цели (Angular, React, Vue, WAF bypass и т.д.).
docker_shell_tools.py
Инструмент выполнения команд в Docker-контейнере cania-xss-runner. Санитизирует вывод (экранирует спецсимволы) для безопасной передачи в LLM.
log_sanitizer.py
Очистка сырых логов от управляющих символов перед передачей в LLM. Предотвращает ошибки парсинга JSON.
pipeline_bridge.py
Извлекает найденные пути (директории) из OSINT-вывода и передает их Spider для расширения области сканирования.
Агенты (ai_agent_*/)
ai_agent_terminal/ai_agent_terminal.py
OSINT-агент. Выполняет в Docker-контейнере:

    curl — проверка доступности цели
    whois и dig — информация о домене
    nmap — сканирование портов
    whatweb — определение технологий
    gobuster — поиск скрытых директорий
    CURL-фоллбэк, если gobuster не сработал (для SPA)

ai_agent_scraper/ai_agent_scraper.py
Парсер-агент. Принимает сырые логи от OSINT-агента и преобразует их в структурированный JSON:

    Парсит вывод nmap (порты, сервисы)
    Парсит вывод gobuster (директории, статусы)
    Парсит вывод whatweb (технологии, CMS, фреймворки)
    Классифицирует находки по критичности

ai_agent_exploiter/ai_agent_exploiter.py
Агент планирования атак. Использует RAG для поиска релевантных XSS-пейлоадов на основе технологического стека. Для каждого найденного поля выбирает 1-2 оптимальных пейлоада.
ai_agent_reporter/ai_agent_reporter.py
Агент генерации отчетов. Создает подробный Markdown-отчет по стандарту PTES:

    Краткий обзор
    Найденные уязвимости с доказательствами
    Статистика
    Рекомендации по исправлению

Сохраняет отчет:

    На диск в папку reports/
    В MongoDB (коллекция reports)


Установка
Требования

    Python 3.10 или выше
    Docker Desktop
    OpenRouter API key (для доступа к LLM)

Пошаговая установка

    Клонируйте репозиторий
        git clone https://github.com/...
        cd cania-xss/ai-agents

    Запустите скрипт установки
    Windows:
        setup.bat
    Linux/macOS:
        chmod +x setup.sh
        ./setup.sh

    Скрипт автоматически:
        Создаст виртуальное окружение
        Установит все зависимости
        Загрузит браузер Chromium для Playwright

    Настройте переменные окружения
        Скопируйте файл .env.example в .env:
            cp .env.example .env
        
        Откройте .env и укажите ваш API ключ:
            OPENROUTER_API_KEY=sk-or-ваш-ключ
            ID_MODEL=google/gemini-flash-1.5

            # MongoDB (необязательно, для хранения отчетов)
            MONGO_URI=mongodb://localhost:27017
            MONGO_DB=cania_xss
            MONGO_COLLECTION=reports

        Запустите Docker-контейнеры
            docker compose up -d

        Это запустит:
            MongoDB (порт 27017)
            OSINT-контейнер cania-xss-runner (Kali Linux с инструментами)

        Инициализируйте векторную базу данных
            python init_lancedb.py
        
        Этот шаг создает базу XSS-пейлоадов для RAG. Выполняется один раз.

Использование

    Запуск сканирования
        python main.py

    Введите URL цели, когда появится запрос:
        Введите URL цели: http://xss-game.appspot.com/level1/frame

Этапы работы
После запуска вы увидите прогресс по 5 этапам:
[1/5] Сбор сетевой информации (OSINT)

    Проверка доступности цели через curl
    WHOIS и DIG запросы
    Сканирование портов (nmap)
    Определение технологий (whatweb)
    Поиск директорий (gobuster)

[2/5] Запуск Паука (поиск форм)

    Обход сайта (макс. глубина: 3 уровня)
    Поиск полей ввода (input, textarea)
    Извлечение метаданных (label, placeholder, aria-label)

[3/5] Выбор стратегии атак (Exploiter)

    Анализ технологического стека
    Поиск релевантных пейлоадов через RAG
    Планирование атак для каждого поля

[4/5] Выполнение инъекций

    Переход на каждую страницу
    Ввод пейлоадов в поля
    Детектирование XSS (alert, DOM-изменения, отражение)
    Ограничение: 5 пейлоадов на поле

[5/5] Генерация отчета

    Создание Markdown-отчета
    Сохранение в reports/xss_audit_report.md
    Сохранение в MongoDB


P.S. Еще дорабатываю. Не работает нормально OSINT-ветка, нужна калибровка некоторых других блоков, также репортер выдает не сильно красивые отчеты. В ближайшее время исправлю
