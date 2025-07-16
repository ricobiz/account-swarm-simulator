#!/usr/bin/env python3
"""
Улучшенный RPA бот с полной интеграцией Multilogin API
Использует предоставленный токен для управления профилями
"""

import os
import sys
import json
import time
import logging
import traceback
from datetime import datetime
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import requests
import undetected_chromedriver as uc
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains
from selenium.common.exceptions import TimeoutException, WebDriverException
from multilogin_enhanced import MultiloginEnhanced

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format=\'%(asctime)s - %(name)s - %(levelname)s - %(message)s\',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(\'/tmp/rpa_bot.log\', encoding=\'utf-8\')
    ]
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Конфигурация
SUPABASE_URL = os.getenv(\'SUPABASE_URL\', \'https://izmgzstdgoswlozinmyk.supabase.co\')
SUPABASE_SERVICE_KEY = os.getenv(\'SUPABASE_SERVICE_KEY\', \'\')
MULTILOGIN_TOKEN = os.getenv(\'MULTILOGIN_TOKEN\') # Теперь берется из переменной окружения
ELEMENT_WAIT_TIMEOUT = 10

class MultiloginRPABot:
    def __init__(self):
        self.driver = None
        self.wait = None
        self.multilogin = None
        self.current_profile_id = None
        self.current_account = None
        self.init_multilogin()
        
    def init_multilogin(self):
        """Инициализация Multilogin"""
        try:
            if MULTILOGIN_TOKEN:
                logger.info("🔧 Инициализация Multilogin...")
                self.multilogin = MultiloginEnhanced(MULTILOGIN_TOKEN)
                
                if self.multilogin.check_connection():
                    logger.info("✅ Multilogin успешно подключен")
                else:
                    logger.warning("⚠️ Multilogin API недоступен")
            else:
                logger.warning("⚠️ Токен Multilogin не найден")
        except Exception as e:
            logger.error(f"❌ Ошибка инициализации Multilogin: {e}")

    def setup_browser(self, account_data=None):
        """Настройка браузера с Multilogin или fallback на обычный Chrome"""
        try:
            # Закрываем предыдущий драйвер если есть
            if self.driver:
                self.cleanup_browser()
            
            # Пробуем использовать Multilogin
            if self.multilogin and account_data:
                logger.info("🚀 Попытка использования Multilogin...")
                
                profile_id = self.multilogin.get_profile_for_account(account_data)
                if profile_id:
                    profile_info = self.multilogin.start_profile(profile_id)
                    if profile_info:
                        self.current_profile_id = profile_id
                        self.current_account = account_data
                        
                        driver = self.multilogin.get_selenium_driver(profile_id)
                        if driver:
                            self.driver = driver
                            self.wait = WebDriverWait(self.driver, ELEMENT_WAIT_TIMEOUT)
                            logger.info("✅ Multilogin браузер настроен")
                            return True
            
            # Fallback на обычный Chrome
            logger.info("🔄 Использование обычного Chrome...")
            return self.setup_regular_chrome()
            
        except Exception as e:
            logger.error(f"❌ Ошибка настройки браузера: {e}")
            return self.setup_regular_chrome()

    def setup_regular_chrome(self):
        """Настройка обычного Chrome с антидетектом"""
        try:
            options = Options()
            
            # Основные настройки для headless режима
            options.add_argument(\'--headless\')
            options.add_argument(\'--no-sandbox\')
            options.add_argument(\'--disable-dev-shm-usage\')
            options.add_argument(\'--disable-gpu\')
            options.add_argument(\'--window-size=1920,1080\')
            
            # Антидетект настройки
            options.add_argument(\'--disable-blink-features=AutomationControlled\')
            options.add_experimental_option("excludeSwitches", ["enable-automation"])
            options.add_experimental_option(\'useAutomationExtension\', False)
            options.add_argument(\'--disable-web-security\')
            options.add_argument(\'--disable-features=VizDisplayCompositor\')
            options.add_argument(\'--disable-extensions\')
            options.add_argument(\'--disable-plugins\')
            options.add_argument(\'--disable-images\')
            options.add_argument(\'--disable-javascript\')
            
            # User agent
            options.add_argument(\'--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36\')
            
            self.driver = uc.Chrome(options=options)
            self.wait = WebDriverWait(self.driver, ELEMENT_WAIT_TIMEOUT)
            
            # Выполняем скрипт для скрытия автоматизации
            self.driver.execute_script("Object.defineProperty(navigator, \'webdriver\', {get: () => undefined})")
            
            logger.info("✅ Обычный Chrome настроен")
            return True
            
        except Exception as e:
            logger.error(f"❌ Ошибка настройки Chrome: {e}")
            return False

    def cleanup_browser(self):
        """Очистка браузера и профиля"""
        try:
            if self.driver:
                self.driver.quit()
                self.driver = None
                self.wait = None
                
            if self.multilogin and self.current_profile_id:
                self.multilogin.stop_profile(self.current_profile_id)
                self.current_profile_id = None
                
            self.current_account = None
            logger.info("🧹 Браузер очищен")
            
        except Exception as e:
            logger.error(f"❌ Ошибка очистки браузера: {e}")

    def execute_task(self, task_data):
        """Выполнение RPA задачи"""
        try:
            task_id = task_data.get(\'id\')
            account_data = task_data.get(\'account\', {})
            actions = task_data.get(\'actions\', [])
            
            logger.info(f"🎯 Выполнение задачи {task_id} для аккаунта {account_data.get(\'username\', \'unknown\')}")
            
            # Настройка браузера
            if not self.setup_browser(account_data):
                raise Exception("Не удалось настроить браузер")
            
            # Выполнение действий
            results = []
            for i, action in enumerate(actions):
                try:
                    logger.info(f"🔄 Выполнение действия {i+1}/{len(actions)}: {action.get(\'type\')}")
                    result = self.execute_action(action)
                    results.append(result)
                    
                    # Пауза между действиями
                    time.sleep(action.get(\'delay\', 1))
                    
                except Exception as e:
                    logger.error(f"❌ Ошибка выполнения действия {i+1}: {e}")
                    results.append({\'success\': False, \'error\': str(e)}\')
            
            # Отчет о выполнении
            success_count = sum(1 for r in results if r.get(\'success\', False))
            logger.info(f"✅ Задача {task_id} завершена: {success_count}/{len(actions)} действий успешно")
            
            return {
                \'task_id\': task_id,
                \'success\': success_count > 0,
                \'results\': results,
                \'profile_id\': self.current_profile_id,
                \'account\': account_data.get(\'username\')
            }
            
        except Exception as e:
            logger.error(f"❌ Ошибка выполнения задачи: {e}")
            return {
                \'task_id\': task_data.get(\'id\'),
                \'success\': False,
                \'error\': str(e)
            }
        finally:
            self.cleanup_browser()

    def execute_action(self, action):
        """Выполнение отдельного действия"""
        action_type = action.get(\'type\')
        
        try:
            if action_type == \'navigate\':
                return self.action_navigate(action)
            elif action_type == \'click\':
                return self.action_click(action)
            elif action_type == \'input\':
                return self.action_input(action)
            elif action_type == \'wait\':
                return self.action_wait(action)
            elif action_type == \'scroll\':
                return self.action_scroll(action)
            elif action_type == \'screenshot\':
                return self.action_screenshot(action)
            else:
                raise Exception(f"Неизвестный тип действия: {action_type}")
                
        except Exception as e:
            logger.error(f"❌ Ошибка действия {action_type}: {e}")
            return {\'success\': False, \'error\': str(e)}

    def action_navigate(self, action):
        """Переход на URL"""
        url = action.get(\'url\')
        self.driver.get(url)
        logger.info(f"🌐 Переход на {url}")
        return {\'success\': True, \'url\': url}

    def action_click(self, action):
        """Клик по элементу"""
        selector = action.get(\'selector\')
        element = self.wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, selector)))
        element.click()
        logger.info(f"👆 Клик по {selector}")
        return {\'success\': True, \'selector\': selector}

    def action_input(self, action):
        """Ввод текста"""
        selector = action.get(\'selector\')
        text = action.get(\'text\')
        element = self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, selector)))
        element.clear()
        element.send_keys(text)
        logger.info(f"⌨️ Ввод текста в {selector}")
        return {\'success\': True, \'selector\': selector, \'text\': \'***\'}

    def action_wait(self, action):
        """Ожидание"""
        duration = action.get(\'duration\', 1)
        time.sleep(duration)
        logger.info(f"⏱️ Ожидание {duration} сек")
        return {\'success\': True, \'duration\': duration}

    def action_scroll(self, action):
        """Прокрутка страницы"""
        direction = action.get(\'direction\', \'down\')
        pixels = action.get(\'pixels\', 500)
        
        if direction == \'down\':
            self.driver.execute_script(f"window.scrollBy(0, {pixels});")
        else:
            self.driver.execute_script(f"window.scrollBy(0, -{pixels});")
            
        logger.info(f"📜 Прокрутка {direction} на {pixels}px")
        return {\'success\': True, \'direction\': direction, \'pixels\': pixels}

    def action_screenshot(self, action):
        """Создание скриншота"""
        import base64
        filename = f"/tmp/screenshot_{int(time.time())}.png"
        self.driver.save_screenshot(filename)
        
        # Читаем файл и кодируем в base64
        try:
            with open(filename, 'rb') as f:
                screenshot_data = base64.b64encode(f.read()).decode('utf-8')
            logger.info(f"📸 Скриншот создан и закодирован в base64: {len(screenshot_data)} символов")
            return {
                'success': True, 
                'filename': filename,
                'screenshot': screenshot_data,
                'screenshot_size': len(screenshot_data)
            }
        except Exception as e:
            logger.error(f"❌ Ошибка чтения скриншота: {e}")
            return {'success': False, 'error': str(e)}

# Глобальный экземпляр бота
bot = MultiloginRPABot()

# API Endpoints

@app.route(\'/health\', methods=[\'GET\'])
def health_check():
    """Проверка здоровья сервиса"""
    return jsonify({
        \'status\': \'ok\',
        \'timestamp\': datetime.now().isoformat(),
        \'version\': \'2.0.0\',
        \'environment\': \'railway\',
        \'multilogin\': {
            \'available\': bot.multilogin is not None,
            \'connected\': bot.multilogin.check_connection() if bot.multilogin else False
        }
    })

@app.route(\'/status\', methods=[\'GET\'])
def get_status():
    """Получение статуса бота"""
    status = {
        \'bot_ready\': bot.driver is not None,
        \'current_profile\': bot.current_profile_id,
        \'current_account\': bot.current_account.get(\'username\') if bot.current_account else None,
        \'multilogin_status\': \'connected\' if bot.multilogin and bot.multilogin.check_connection() else \'disconnected\'
    }
    
    if bot.multilogin:
        status[\'active_profiles\'] = bot.multilogin.list_active_profiles()
        
    return jsonify(status)

@app.route(\'/execute\', methods=[\'POST\'])
def execute_task():
    """Выполнение RPA задачи"""
    try:
        task_data = request.get_json()
        
        if not task_data:
            return jsonify({\'error\': \'Нет данных задачи\'}), 400
            
        result = bot.execute_task(task_data)
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"❌ Ошибка API execute: {e}")
        return jsonify({\'error\': str(e)}), 500

@app.route(\'/profiles\', methods=[\'GET\'])
def list_profiles():
    """Список профилей Multilogin"""
    try:
        if not bot.multilogin:
            return jsonify({\'error\': \'Multilogin не подключен\'}), 503
            
        profiles = bot.multilogin.get_profiles()
        return jsonify({\'profiles\': profiles})
        
    except Exception as e:
        logger.error(f"❌ Ошибка получения профилей: {e}")
        return jsonify({\'error\': str(e)}), 500

@app.route(\'/profiles\', methods=[\'POST\'])
def create_profile():
    """Создание нового профиля"""
    try:
        if not bot.multilogin:
            return jsonify({\'error\': \'Multilogin не подключен\'}), 503
            
        account_data = request.get_json()
        profile_id = bot.multilogin.create_profile(account_data)
        
        if profile_id:
            return jsonify({\'profile_id\': profile_id})
        else:
            return jsonify({\'error\': \'Не удалось создать профиль\'}), 500
            
    except Exception as e:
        logger.error(f"❌ Ошибка создания профиля: {e}")
        return jsonify({\'error\': str(e)}), 500

@app.route(\'/profiles/<profile_id>/start\', methods=[\'POST\'])
def start_profile(profile_id):
    """Запуск профиля"""
    try:
        if not bot.multilogin:
            return jsonify({\'error\': \'Multilogin не подключен\'}), 503
            
        result = bot.multilogin.start_profile(profile_id)
        
        if result:
            return jsonify(result)
        else:
            return jsonify({\'error\': \'Не удалось запустить профиль\'}), 500
            
    except Exception as e:
        logger.error(f"❌ Ошибка запуска профиля: {e}")
        return jsonify({\'error\': str(e)}), 500

@app.route(\'/profiles/<profile_id>/stop\', methods=[\'POST\'])
def stop_profile(profile_id):
    """Остановка профиля"""
    try:
        if not bot.multilogin:
            return jsonify({\'error\': \'Multilogin не подключен\'}), 503
            
        success = bot.multilogin.stop_profile(profile_id)
        
        if success:
            return jsonify({\'success\': True})
        else:
            return jsonify({\'error\': \'Не удалось остановить профиль\'}), 500
            
    except Exception as e:
        logger.error(f"❌ Ошибка остановки профиля: {e}")
        return jsonify({\'error\': str(e)}), 500

@app.route(\'/cleanup\', methods=[\'POST\'])
def cleanup():
    """Очистка всех ресурсов"""
    try:
        bot.cleanup_browser()
        
        if bot.multilogin:
            bot.multilogin.cleanup_all_profiles()
            
        return jsonify({\'success\': True})
        
    except Exception as e:
        logger.error(f"❌ Ошибка очистки: {e}")
        return jsonify({\'error\': str(e)}), 500

if __name__ == \'__main__\':
    logger.info("🚀 Запуск RPA бота с Multilogin интеграцией...")
    
    # Создаем директорию для логов
    os.makedirs(\'/tmp\', exist_ok=True)
    
    port = int(os.getenv(\'PORT\', 5000))
    app.run(host=\'0.0.0.0\', port=port, debug=False)





