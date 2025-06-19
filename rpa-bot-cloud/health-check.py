
#!/usr/bin/env python3
"""
Скрипт проверки здоровья RPA бота для Railway
"""

import subprocess
import sys
import json
import time
from pathlib import Path

def check_chrome():
    """Проверка Chrome"""
    try:
        result = subprocess.run(['google-chrome', '--version', '--no-sandbox'], 
                              capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            return {"status": "ok", "version": result.stdout.strip()}
        else:
            return {"status": "error", "message": "Chrome не запускается"}
    except Exception as e:
        return {"status": "error", "message": f"Chrome недоступен: {str(e)}"}

def check_python_deps():
    """Проверка Python зависимостей"""
    required_packages = [
        'selenium', 'undetected_chromedriver', 'fake_useragent', 
        'flask', 'requests', 'numpy', 'pandas', 'sklearn'
    ]
    
    missing = []
    for package in required_packages:
        try:
            __import__(package)
        except ImportError:
            missing.append(package)
    
    if missing:
        return {"status": "error", "missing": missing}
    else:
        return {"status": "ok", "packages": len(required_packages)}

def check_display():
    """Проверка виртуального дисплея"""
    display = os.environ.get('DISPLAY', ':99')
    try:
        result = subprocess.run(['xdpyinfo', '-display', display], 
                              capture_output=True, text=True, timeout=5)
        if result.returncode == 0:
            return {"status": "ok", "display": display}
        else:
            return {"status": "error", "message": "Дисплей недоступен"}
    except Exception as e:
        return {"status": "warning", "message": f"Не удалось проверить дисплей: {str(e)}"}

def check_directories():
    """Проверка необходимых директорий"""
    dirs = ['screenshots', 'logs', 'profiles', 'extensions', 'downloads']
    missing = []
    
    for dir_name in dirs:
        dir_path = Path(dir_name)
        if not dir_path.exists():
            missing.append(dir_name)
        elif not dir_path.is_dir():
            missing.append(f"{dir_name} (не директория)")
    
    if missing:
        return {"status": "warning", "missing": missing}
    else:
        return {"status": "ok", "directories": len(dirs)}

def main():
    """Основная функция проверки"""
    print("🔍 Проверка здоровья RPA бота...")
    
    health_status = {
        "timestamp": time.time(),
        "overall_status": "ok",
        "checks": {}
    }
    
    # Проверка Chrome
    print("🌐 Проверка Chrome...")
    chrome_status = check_chrome()
    health_status["checks"]["chrome"] = chrome_status
    if chrome_status["status"] == "error":
        health_status["overall_status"] = "error"
    
    # Проверка Python зависимостей
    print("🐍 Проверка Python зависимостей...")
    deps_status = check_python_deps()
    health_status["checks"]["python_dependencies"] = deps_status
    if deps_status["status"] == "error":
        health_status["overall_status"] = "error"
    
    # Проверка дисплея
    print("🖥️  Проверка дисплея...")
    display_status = check_display()
    health_status["checks"]["display"] = display_status
    
    # Проверка директорий
    print("📁 Проверка директорий...")
    dirs_status = check_directories()
    health_status["checks"]["directories"] = dirs_status
    
    # Вывод результата
    print("\n" + "="*50)
    print("РЕЗУЛЬТАТ ПРОВЕРКИ ЗДОРОВЬЯ")
    print("="*50)
    print(json.dumps(health_status, indent=2, ensure_ascii=False))
    
    if health_status["overall_status"] == "ok":
        print("\n✅ Все проверки пройдены успешно!")
        sys.exit(0)
    else:
        print("\n❌ Обнаружены проблемы!")
        sys.exit(1)

if __name__ == "__main__":
    import os
    main()
