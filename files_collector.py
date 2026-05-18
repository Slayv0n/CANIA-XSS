# collect_code.py
import os
from pathlib import Path

# НАСТРОЙКИ
# Укажи папку, которую нужно собрать
TARGET_DIR = Path(r"C:\Users\serge\Desktop\CANIA-XSS\ai-agents")
# Куда сохранить итоговый файл
OUTPUT_FILE = Path(r"C:\Users\serge\Desktop\CANIA-XSS\project_dump.txt")

# Какие расширения включать
ALLOWED_EXTENSIONS = {'.py'}
# Какие папки игнорировать (чтобы не засорять файл бинарными данными)
SKIP_DIRS = {'__pycache__', 'venv', '.git', 'node_modules', 'security_docs_lancedb', 'reports', 'execution_results'}

def collect_code():
    if not TARGET_DIR.exists():
        print(f"❌ Папка {TARGET_DIR} не найдена!")
        return

    print(f"🔍 Сбор кода из: {TARGET_DIR}")
    print(f"💾 Сохранение в: {OUTPUT_FILE}")
    
    count = 0
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as outfile:
        # Заголовок файла
        outfile.write(f"# CANIA-XSS PROJECT DUMP\n# Generated from: {TARGET_DIR}\n\n")
        
        for root, dirs, files in os.walk(TARGET_DIR):
            # Исключаем ненужные папки на лету
            dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
            
            # Сортируем для порядка
            dirs.sort()
            files.sort()

            for file in files:
                file_path = Path(root) / file
                ext = file_path.suffix.lower()
                
                if ext in ALLOWED_EXTENSIONS:
                    try:
                        # Вычисляем относительный путь для красоты
                        relative_path = file_path.relative_to(TARGET_DIR)
                        
                        with open(file_path, 'r', encoding='utf-8') as f:
                            content = f.read()
                            
                        # Пишем разделитель и имя файла
                        outfile.write(f"\n{'='*60}\n📄 ФАЙЛ: {relative_path}\n{'='*60}\n\n")
                        outfile.write(content + "\n\n")
                        count += 1
                    except Exception as e:
                        print(f"⚠️ Ошибка чтения {file_path}: {e}")

    print(f"✅ ГОТОВО! Обработано файлов: {count}")
    print(f"📏 Размер итогового файла: {OUTPUT_FILE.stat().st_size / 1024:.2f} KB")
    print(f"👉 Загрузи '{OUTPUT_FILE}' в чат Qwen вместе с инструкцией выше.")

if __name__ == "__main__":
    collect_code()