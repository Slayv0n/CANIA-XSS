import os

def merge_important_files(directory, output_file):
    # Папки, которые мы вообще не будем сканировать (чтобы скрипт работал за долю секунды)
    IGNORE_DIRS = {'node_modules', '.git', 'dist', 'build'}
    
    # Файлы, которые нам не нужны (огромные локи, картинки или сам этот скрипт)
    IGNORE_FILES = {'package-lock.json', 'yarn.lock', 'package-lock.json', 'script.py'}
    
    # Расширения файлов, которые мы хотим скопировать (код, разметка, стили, конфиги)
    ALLOWED_EXTENSIONS = {
        '.js', '.jsx', '.ts', '.tsx', # Скрипты и компоненты React
        '.css', '.scss',              # Стили
        '.html', '.json',             # Разметка и конфиги (например package.json)
        '.env'                        # Переменные окружения (если есть)
    }

    if not os.path.exists(directory):
        print(f"Ошибка: Каталог {directory} не найден.")
        return

    with open(output_file, 'w', encoding='utf-8') as out_file:
        # os.walk позволяет нам управлять тем, в какие папки заходить
        for root, dirs, files in os.walk(directory):
            
            # Удаляем из списка папок те, что в черном списке (скрипт в них даже не зайдет)
            dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
            
            for file in files:
                # 1. Пропускаем файлы из черного списка
                if file in IGNORE_FILES:
                    continue
                
                # 2. Получаем расширение файла и проверяем, нужно ли оно нам
                ext = os.path.splitext(file)[1].lower()
                if ext not in ALLOWED_EXTENSIONS and file != '.gitignore': # .gitignore оставим на всякий
                    continue

                # Полный путь к файлу
                file_path = os.path.join(root, file)
                # Относительный путь (красивый вид для заголовка)
                relative_name = os.path.relpath(file_path, directory)
                
                try:
                    with open(file_path, 'r', encoding='utf-8') as in_file:
                        content = in_file.read()
                        
                    # Записываем в итоговый файл
                    out_file.write(f"{'='*60}\n")
                    out_file.write(f"Файл: {relative_name}\n")
                    out_file.write(f"{'='*60}\n")
                    out_file.write(content)
                    out_file.write("\n\n")
                    
                except Exception as e:
                    print(f"Пропущен файл (ошибка чтения): {relative_name}")

if __name__ == "__main__":
    # Твой путь
    target_directory = r"D:\VScode_projects\CANIA-XSS\frontend"
    # Итоговый файл
    result_filename = "clean_frontend_code.txt"
    
    print("Собираю только важный код (без node_modules и мусора)...")
    merge_important_files(target_directory, result_filename)
    print(f"Готово! Чистый код сохранен в: {result_filename}")