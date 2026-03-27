import os

def merge_important_files(directory, output_file, max_depth=3):
    """
    max_depth: Глубина вложенности. 
    0 - только файлы в корне
    1 - корень + папки первого уровня
    2 - корень + 2 уровня вложенности
    """
    
    # Расширенный список системных папок фреймворков и мусора
    IGNORE_DIRS = {
        'node_modules', '.git', 'dist', 'build', 
        'bin', 'obj', 'Migrations', 'Properties', # Для C# / .NET
        '.vs', '.idea', 'venv', 'env', '__pycache__', 
        '.qodo' # Папка из твоего скриншота
    }
    
    # Файлы, которые точно не нужны
    IGNORE_FILES = {
        'package-lock.json', 'yarn.lock', 'script.py', 'backend.txt', 
        'backend1.txt', 'ocelot.json' # ocelot.json можно убрать отсюда, если хочешь чтобы он копировался
    }
    
    # Разрешенные расширения
    ALLOWED_EXTENSIONS = {
        '.js', '.jsx', '.ts', '.tsx',
        '.css', '.scss',
        '.html', '.json',
        '.env', '.cs', '.yml', '.yaml', '.md'
    }

    # Файлы без расширений или со специфичными именами, которые нам нужны
    ALLOWED_EXACT_FILES = {
        '.gitignore', 'Dockerfile', 'docker-compose.yml'
    }

    if not os.path.exists(directory):
        print(f"Ошибка: Каталог {directory} не найден.")
        return

    directory = os.path.abspath(directory)
    
    # Сюда будем складывать кортежи: (относительный_путь, содержимое_файла)
    collected_files =[]

    for root, dirs, files in os.walk(directory):
        
        # Вычисляем текущую глубину
        rel_path = os.path.relpath(root, directory)
        depth = 0 if rel_path == "." else len(rel_path.split(os.sep))

        # Если глубина превышает заданную, очищаем dirs, чтобы не идти глубже
        if depth >= max_depth:
            dirs[:] =[]
        
        # Удаляем из списка сканирования запрещенные папки (bin, obj и т.д.)
        dirs[:] =[d for d in dirs if d not in IGNORE_DIRS]
        
        for file in files:
            if file in IGNORE_FILES:
                continue
            
            ext = os.path.splitext(file)[1].lower()
            
            # Проверяем, подходит ли файл (либо по расширению, либо по точному имени)
            if ext not in ALLOWED_EXTENSIONS and file not in ALLOWED_EXACT_FILES:
                continue

            file_path = os.path.join(root, file)
            relative_name = os.path.relpath(file_path, directory)
            
            try:
                with open(file_path, 'r', encoding='utf-8') as in_file:
                    content = in_file.read()
                    # Сохраняем в память
                    collected_files.append((relative_name, content))
            except Exception as e:
                print(f"Пропущен файл (ошибка чтения): {relative_name}")

    # Теперь записываем всё в файл в нужном порядке
    with open(output_file, 'w', encoding='utf-8') as out_file:
        
        # === 1. ПИШЕМ ОГЛАВЛЕНИЕ ===
        out_file.write(f"{'='*60}\n")
        out_file.write("ОГЛАВЛЕНИЕ (СКОПИРОВАННЫЕ ФАЙЛЫ):\n")
        out_file.write(f"{'='*60}\n")
        
        if not collected_files:
            out_file.write("Ни одного файла не найдено. Проверьте пути и глубину.\n")
            
        for relative_name, _ in collected_files:
            out_file.write(f"- {relative_name}\n")
            
        out_file.write("\n\n")
        
        # === 2. ПИШЕМ СОДЕРЖИМОЕ ФАЙЛОВ ===
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
    # Теперь можешь смело натравливать его на корневую папку всего проекта
    target_directory = r"D:\VScode_projects\CANIA-XSS" 
    result_filename = "backend1.txt"
    
    # Ставь глубину 4 или 5. Благодаря IGNORE_DIRS он проигнорирует 
    # тяжелые bin/obj внутри микросервисов и соберет только нужные .cs файлы
    max_d = 5 
    print(f"Собираю код (глубина поиска: {max_d})...")
    
    merge_important_files(target_directory, result_filename, max_depth=max_d)
    print(f"Готово! Результат сохранен в: {result_filename}")