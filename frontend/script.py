import os

def merge_important_files(directory, output_file, max_depth=2):
    """
    max_depth: Глубина вложенности. 
    0 - только файлы в корне
    1 - корень + папки первого уровня
    2 - корень + 2 уровня вложенности (обычно оптимально)
    """
    
    # Расширенный список системных папок фреймворков
    IGNORE_DIRS = {
        'node_modules', '.git', 'dist', 'build', 
        'bin', 'obj', 'Migrations', 'Properties', # Для C# / .NET
        '.vs', '.idea', 'venv', 'env', '__pycache__' # Общий мусор
    }
    
    IGNORE_FILES = {'package-lock.json', 'yarn.lock', 'script.py', 'backend.txt'}
    
    ALLOWED_EXTENSIONS = {
        '.js', '.jsx', '.ts', '.tsx',
        '.css', '.scss',
        '.html', '.json',
        '.env', '.cs', '.yml'
    }

    if not os.path.exists(directory):
        print(f"Ошибка: Каталог {directory} не найден.")
        return

    # Подготовка пути, чтобы правильно считать вложенность
    directory = os.path.abspath(directory)

    with open(output_file, 'w', encoding='utf-8') as out_file:
        for root, dirs, files in os.walk(directory):
            
            # ВЫЧИСЛЯЕМ ТЕКУЩУЮ ГЛУБИНУ
            relative_path = os.path.relpath(root, directory)
            if relative_path == ".":
                depth = 0
            else:
                depth = relative_path.count(os.sep) + 1

            # Если глубина превышает заданную, очищаем dirs, чтобы не идти глубже
            if depth >= max_depth:
                dirs[:] = [] # Это говорит os.walk не заходить в подпапки на этом уровне
            
            # Удаляем из списка сканирования запрещенные папки
            dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
            
            # Если мы на допустимой глубине, обрабатываем файлы
            for file in files:
                if file in IGNORE_FILES:
                    continue
                
                ext = os.path.splitext(file)[1].lower()
                if ext not in ALLOWED_EXTENSIONS and file != '.gitignore':
                    continue

                file_path = os.path.join(root, file)
                relative_name = os.path.relpath(file_path, directory)
                
                try:
                    with open(file_path, 'r', encoding='utf-8') as in_file:
                        content = in_file.read()
                        
                    out_file.write(f"{'='*60}\n")
                    out_file.write(f"Файл: {relative_name}\n")
                    out_file.write(f"{'='*60}\n")
                    out_file.write(content)
                    out_file.write("\n\n")
                    
                except Exception as e:
                    print(f"Пропущен файл (ошибка чтения): {relative_name}")

if __name__ == "__main__":
    target_directory = r"D:\VScode_projects\CANIA-XSS"
    result_filename = "backend1.txt"
    
    # Установи max_depth: 
    # 2 или 3 обычно хватает для большинства проектов. 
    # Больше — пойдет в дебри библиотек.
    print(f"Собираю код (глубина поиска: 2)...")
    merge_important_files(target_directory, result_filename, max_depth=2)
    print(f"Готово! Результат: {result_filename}")