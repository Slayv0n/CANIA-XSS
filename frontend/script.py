import os

def merge_important_files(directory, output_file, max_depth=6):
    """
    directory: Корень проекта
    output_file: Имя итогового файла
    max_depth: Глубина (увеличил до 6, чтобы достать до payloads)
    """
    
    # Папки, которые мы игнорируем (бинарники, библиотеки, кэш)
    IGNORE_DIRS = {
        'node_modules', '.git', 'dist', 'build', 
        'bin', 'obj', 'Migrations', 'Properties',
        '.vs', '.idea', 'venv', 'env', '__pycache__', 
        '.qodo', '.claude', '.openclaude',
        'security_docs_lancedb' # Игнорируем базу данных LanceDB (там бинарные файлы)
    }
    
    # Файлы, которые мы игнорируем
    IGNORE_FILES = {
        'package-lock.json', 'yarn.lock', 'script.py', 
        'backend1.txt', 'CANIA-XSS.sln', 'package.json'
    }
    
    # Разрешенные расширения (добавил .py, .bat, .txt)
    ALLOWED_EXTENSIONS = {
        '.js', '.jsx', '.ts', '.tsx',
        '.css', '.scss',
        '.html', '.json',
        '.env', '.cs', '.yml', '.yaml', '.md',
        '.py', '.bat', '.sh', '.txt' # Добавлено для ИИ-агентов
    }

    # Файлы, которые берем обязательно по имени
    ALLOWED_EXACT_FILES = {
        '.gitignore', 'Dockerfile', 'docker-compose.yml', 
        'requirements.txt', '.env.example', 'AGENTS.md',
        'common.txt'
    }

    if not os.path.exists(directory):
        print(f"Ошибка: Каталог {directory} не найден.")
        return

    directory = os.path.abspath(directory)
    collected_files = []

    for root, dirs, files in os.walk(directory):
        rel_path = os.path.relpath(root, directory)
        depth = 0 if rel_path == "." else len(rel_path.split(os.sep))

        if depth >= max_depth:
            dirs[:] = []
            continue
        
        # Фильтруем папки
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        
        for file in files:
            if file in IGNORE_FILES:
                continue
            
            ext = os.path.splitext(file)[1].lower()
            
            # Проверяем, подходит ли файл
            if ext not in ALLOWED_EXTENSIONS and file not in ALLOWED_EXACT_FILES:
                continue

            file_path = os.path.join(root, file)
            relative_name = os.path.relpath(file_path, directory)
            
            try:
                # Пытаемся прочитать файл
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as in_file:
                    content = in_file.read()
                    collected_files.append((relative_name, content))
            except Exception as e:
                print(f"Пропущен файл (ошибка чтения): {relative_name}")

    # Запись в файл
    with open(output_file, 'w', encoding='utf-8') as out_file:
        out_file.write(f"{'='*60}\n")
        out_file.write("ОГЛАВЛЕНИЕ (СКОПИРОВАННЫЕ ФАЙЛЫ):\n")
        out_file.write(f"{'='*60}\n")
        
        for relative_name, _ in collected_files:
            out_file.write(f"- {relative_name}\n")
            
        out_file.write("\n\n")
        out_file.write(f"{'='*60}\n")
        out_file.write("СОДЕРЖИМОЕ ФАЙЛОВ:\n")
        out_file.write(f"{'='*60}\n\n")
        
        for relative_name, content in collected_files:
            out_file.write(f"{'='*60}\n")
            out_file.write(f"Файл: {relative_name}\n")
            out_file.write(f"{'='*60}\n")
            out_file.write(content)
            out_file.write("\n\n")

    print(f"Успешно собрано файлов: {len(collected_files)}")

if __name__ == "__main__":
    # Укажи путь к папке CANIA-XSS
    target_directory = r"D:\VScode_projects\CANIA-XSS" 
    result_filename = "full_project_code.txt"
    
    print(f"Собираю полный код проекта (Backend + Frontend + AI Agents)...")
    merge_important_files(target_directory, result_filename)
    print(f"Готово! Скидывай содержимое файла {result_filename}")