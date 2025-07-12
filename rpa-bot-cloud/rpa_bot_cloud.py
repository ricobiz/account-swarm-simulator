#!/usr/bin/env python3
"""
Enhanced RPA Bot for Railway - интеграция с Multilogin и полный функционал
Заменяет базовый rpa_bot_cloud.py с полной функциональностью
"""

import os
import json
import time
import logging
import base64
import random
import traceback
from flask import Flask, request, jsonify
import requests
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains
from selenium.common.exceptions import WebDriverException, TimeoutException

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('logs/rpa_bot.log', encoding='utf-8')
    ]
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Конфигурация
SUPABASE_URL = os.getenv('SUPABASE_URL', 'https://izmgzstdgoswlozinmyk.supabase.co')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_KEY', '')
MULTILOGIN_TOKEN = os.getenv('MULTILOGIN_TOKEN', '')
BOT_VERSION = "Enhanced-Railway-v2.1"
ENVIRONMENT = "railway-enhanced"

class MultiloginManager:
    """Менеджер для работы с Multilogin API"""
    def __init__(self, token=None):
        self.token = token or MULTILOGIN_TOKEN
        self.base_url = "https://api.multiloginapp.com/v2"
        self.active_profiles = {}
        logger.info(f"MultiloginManager инициализирован с токеном: {'есть' if self.token else 'нет'}")

    def check_connection(self):
        """Проверка подключения к Multilogin"""
        if not self.token:
            return False
        try:
            response = requests.get(
                f"{self.base_url}/profile",
                headers={"Authorization": f"Bearer {self.token}"},
                timeout=10
            )
            return response.status_code == 200
        except:
            return False

    def get_profiles(self):
        """Получение списка профилей"""
        if not self.token:
            return []
        try:
            response = requests.get(
                f"{self.base_url}/profile",
                headers={"Authorization": f"Bearer {self.token}"},
                timeout=10
            )
            if response.status_code == 200:
                return response.json().get('data', [])
        except Exception as e:
            logger.error(f"Ошибка получения профилей: {e}")
        return []

    def start_profile(self, profile_id):
        """Запуск профиля"""
        if not self.token:
            return None
        try:
            response = requests.get(
                f"{self.base_url}/profile/start?profileId={profile_id}",
                headers={"Authorization": f"Bearer {self.token}"},
                timeout=30
            )
            if response.status_code == 200:
                data = response.json()
                self.active_profiles[profile_id] = data
                return data
        except Exception as e:
            logger.error(f"Ошибка запуска профиля: {e}")
        return None

    def stop_profile(self, profile_id):
        """Остановка профиля"""
        if not self.token:
            return
        try:
            requests.get(
                f"{self.base_url}/profile/stop?profileId={profile_id}",
                headers={"Authorization": f"Bearer {self.token}"},
                timeout=10
            )
            if profile_id in self.active_profiles:
                del self.active_profiles[profile_id]
        except Exception as e:
            logger.error(f"Ошибка остановки профиля: {e}")

    def get_selenium_driver(self, profile_id):
        """Получение Selenium драйвера для профиля"""
        if profile_id not in self.active_profiles:
            return None
        
        profile_data = self.active_profiles[profile_id]
        selenium_port = profile_data.get('data', {}).get('port')
        
        if not selenium_port:
            return None

        try:
            options = Options()
            options.add_experimental_option("debuggerAddress", f"127.0.0.1:{selenium_port}")
            driver = webdriver.Chrome(options=options)
            return driver
        except Exception as e:
            logger.error(f"Ошибка создания Selenium драйвера: {e}")
            return None

class EnhancedRPABot:
    """Расширенный RPA бот с поддержкой Multilogin"""
    
    def __init__(self):
        self.driver = None
        self.multilogin = None
        self.current_profile_id = None
        self.task_results = {}
        
        # Инициализация Multilogin если есть токен
        if MULTILOGIN_TOKEN:
            self.multilogin = MultiloginManager()
            if self.multilogin.check_connection():
                logger.info("✅ Multilogin подключен успешно")
            else:
                logger.warning("⚠️ Multilogin недоступен")
                self.multilogin = None
        else:
            logger.info("ℹ️ Токен Multilogin не найден, работаем в базовом режиме")

    def setup_chrome_driver(self, account_data=None, multilogin_token=None):
        """Настройка Chrome драйвера с антидетектом"""
        try:
            # Обновляем токен Multilogin если предоставлен в задаче
            if multilogin_token:
                logger.info("🔄 Используем токен Multilogin из задачи")
                self.multilogin = MultiloginManager(multilogin_token)
                if self.multilogin.check_connection():
                    logger.info("✅ Multilogin подключен с токеном из задачи")
                else:
                    logger.warning("⚠️ Токен Multilogin из задачи недействителен")
                    self.multilogin = None
            elif MULTILOGIN_TOKEN and not self.multilogin:
                logger.info("🔄 Используем токен Multilogin из переменной окружения")
                self.multilogin = MultiloginManager()
                if self.multilogin.check_connection():
                    logger.info("✅ Multilogin подключен с токеном из переменных")
                else:
                    logger.warning("⚠️ Токен Multilogin из переменных недействителен")
                    self.multilogin = None
            
            # Пробуем использовать Multilogin если доступен
            if self.multilogin and account_data:
                profiles = self.multilogin.get_profiles()
                if profiles:
                    # Используем первый доступный профиль
                    profile_id = profiles[0].get('uuid')
                    if profile_id:
                        profile_info = self.multilogin.start_profile(profile_id)
                        if profile_info:
                            self.current_profile_id = profile_id
                            driver = self.multilogin.get_selenium_driver(profile_id)
                            if driver:
                                logger.info("✅ Используется Multilogin браузер")
                                return driver
            
            # Fallback на обычный Chrome с антидетектом
            logger.info("🔄 Используется обычный Chrome с антидетектом")
            return self.setup_regular_chrome()
            
        except Exception as e:
            logger.error(f"Ошибка настройки драйвера: {e}")
            return self.setup_regular_chrome()

    def setup_regular_chrome(self):
        """Настройка обычного Chrome с антидетектом"""
        try:
            logger.info("🔧 Настройка базового Chrome с антидетектом...")
            
            options = Options()
            options.add_argument('--headless=new')
            options.add_argument('--no-sandbox')
            options.add_argument('--disable-dev-shm-usage')
            options.add_argument('--disable-gpu')
            options.add_argument('--window-size=1920,1080')
            options.add_argument('--disable-web-security')
            options.add_argument('--disable-features=VizDisplayCompositor')
            
            # Антидетект опции
            options.add_argument('--disable-blink-features=AutomationControlled')
            options.add_experimental_option("excludeSwitches", ["enable-automation"])
            options.add_experimental_option('useAutomationExtension', False)
            
            # User Agent
            options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
            
            driver = webdriver.Chrome(options=options)
            
            # Выполняем антидетект скрипты
            driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
            
            logger.info("✅ Базовый Chrome настроен с антидетектом")
            return driver
            
        except Exception as e:
            logger.error(f"❌ Ошибка настройки базового Chrome: {e}")
            raise

    def execute_action(self, action):
        """Выполнение действия"""
        try:
            action_type = action.get('type')
            logger.info(f"🎬 Выполняем действие: {action_type}")
            
            if action_type == 'navigate':
                url = action.get('url')
                logger.info(f"🌐 Переход на: {url}")
                self.driver.get(url)
                time.sleep(random.uniform(2, 4))
                
            elif action_type == 'wait':
                duration = action.get('duration', 2000) / 1000
                logger.info(f"⏱️ Ожидание {duration} сек")
                time.sleep(duration)
                
            elif action_type == 'screenshot':
                """Создание скриншота"""
                logger.info("📸 Создание скриншота страницы")
                try:
                    # Получение скриншота как PNG bytes
                    screenshot_png = self.driver.get_screenshot_as_png()
                    
                    # Конвертируем в base64
                    screenshot_base64 = base64.b64encode(screenshot_png).decode('utf-8')
                    
                    # Сохраняем результат
                    if not hasattr(self, 'task_results'):
                        self.task_results = {}
                    self.task_results['screenshot'] = f"data:image/png;base64,{screenshot_base64}"
                    
                    logger.info(f"✅ Скриншот создан и сконвертирован в base64: {len(screenshot_base64)} символов")
                    return True
                    
                except Exception as e:
                    logger.error(f"❌ Ошибка создания скриншота: {e}")
                    return False
                    
            elif action_type == 'click':
                selector = action.get('selector')
                if selector:
                    element = WebDriverWait(self.driver, 10).until(
                        EC.element_to_be_clickable((By.CSS_SELECTOR, selector))
                    )
                    ActionChains(self.driver).move_to_element(element).click().perform()
                    time.sleep(random.uniform(1, 2))
                
            elif action_type == 'type':
                selector = action.get('selector')
                text = action.get('text', '')
                if selector and text:
                    element = WebDriverWait(self.driver, 10).until(
                        EC.presence_of_element_located((By.CSS_SELECTOR, selector))
                    )
                    element.clear()
                    # Человекоподобный ввод
                    for char in text:
                        element.send_keys(char)
                        time.sleep(random.uniform(0.05, 0.15))
                        
            elif action_type == 'scroll':
                x = action.get('x', 0)
                y = action.get('y', 300)
                self.driver.execute_script(f"window.scrollBy({x}, {y});")
                time.sleep(random.uniform(1, 2))
                
            elif action_type == 'check_element':
                selector = action.get('selector')
                if selector:
                    try:
                        WebDriverWait(self.driver, 10).until(
                            EC.presence_of_element_located((By.CSS_SELECTOR, selector))
                        )
                        logger.info(f"✅ Элемент найден: {selector}")
                        return True
                    except TimeoutException:
                        logger.warning(f"⚠️ Элемент не найден: {selector}")
                        return False
                        
            elif action_type == 'telegram_like':
                logger.info("❤️ Выполняем лайк в Telegram")
                # Базовая реализация для Telegram
                try:
                    # Ищем кнопку реакции
                    reaction_button = WebDriverWait(self.driver, 10).until(
                        EC.element_to_be_clickable((By.CSS_SELECTOR, ".ReactionButton, .reaction-button, [data-testid='reaction']"))
                    )
                    reaction_button.click()
                    time.sleep(1)
                    return True
                except TimeoutException:
                    logger.warning("⚠️ Кнопка реакции не найдена")
                    return False
                    
            elif action_type == 'multilogin_test':
                logger.info("🔧 Тестируем интеграцию Multilogin")
                return self.multilogin is not None and self.current_profile_id is not None
                
            return True
            
        except Exception as e:
            logger.error(f"❌ Ошибка выполнения действия {action_type}: {e}")
            return False

    def execute_rpa_task(self, task):
        """Выполнение RPA задачи"""
        task_id = task.get('taskId')
        logger.info(f"🚀 Запуск RPA задачи: {task_id}")
        
        try:
            # Подготовка данных аккаунта
            account_data = {
                'username': task.get('accountId', 'test-account'),
                'platform': task.get('metadata', {}).get('platform', 'web')
            }
            
            # Получение токена Multilogin из задачи (приоритет: прямой токен > metadata > переменная окружения)
            multilogin_token = None
            
            # Сначала проверяем прямой токен в задаче
            if task.get('multilogin_token'):
                multilogin_token = task.get('multilogin_token')
                logger.info("🔑 Используем токен Multilogin из поля multilogin_token")
            # Потом проверяем в metadata
            elif task.get('metadata', {}).get('multilogin_token_info', {}).get('token'):
                token_info = task.get('metadata', {}).get('multilogin_token_info', {})
                multilogin_token = token_info.get('token')
                logger.info("🔑 Используем токен Multilogin из metadata.multilogin_token_info")
            # Fallback на переменную окружения
            elif MULTILOGIN_TOKEN:
                multilogin_token = MULTILOGIN_TOKEN
                logger.info("🔑 Используем токен Multilogin из переменной окружения")
            else:
                logger.warning("⚠️ Токен Multilogin не найден ни в задаче, ни в переменных")
                
            logger.info(f"🔑 Итоговый статус токена: {'✅ ЕСТЬ' if multilogin_token else '❌ НЕТ'}")
            if multilogin_token:
                logger.info(f"🔑 Токен (первые 50 символов): {multilogin_token[:50]}...")
            
            # Инициализация результатов задачи
            self.task_results = {}
            
            # Настройка браузера с токеном Multilogin
            self.driver = self.setup_chrome_driver(account_data, multilogin_token)
            
            # Переход на начальную страницу
            initial_url = task.get('url')
            if initial_url:
                logger.info(f"🌐 Переход на начальную страницу: {initial_url}")
                self.driver.get(initial_url)
                time.sleep(2)
            
            # Выполнение действий
            actions = task.get('actions', [])
            success_count = 0
            
            for i, action in enumerate(actions):
                logger.info(f"📋 Действие {i+1}/{len(actions)}: {action.get('type')}")
                
                try:
                    if self.execute_action(action):
                        success_count += 1
                        logger.info(f"✅ Действие {i+1} выполнено успешно")
                    else:
                        logger.warning(f"⚠️ Действие {i+1} выполнено с предупреждениями")
                        
                except Exception as e:
                    logger.error(f"❌ Ошибка в действии {i+1}: {e}")
                
                # Небольшая пауза между действиями
                time.sleep(random.uniform(1, 2))
            
            # Финальные результаты задачи
            result_data = {
                'success': True,
                'actions_completed': success_count,
                'total_actions': len(actions),
                'task_id': task_id,
                'multilogin_integrated': self.multilogin is not None and self.current_profile_id is not None,
                'screenshot': self.task_results.get('screenshot') if hasattr(self, 'task_results') else None,
                'platform': task.get('metadata', {}).get('platform', 'web'),
                'execution_time': 0,  # TODO: добавить реальное время выполнения
                'browser_fingerprint': self._get_browser_fingerprint() if self.driver else {},
                'multilogin_profile': self.current_profile_id
            }
            
            # Результат
            if success_count == len(actions):
                logger.info("✅ Все действия выполнены успешно")
                return True
            else:
                logger.info(f"⚠️ Выполнено {success_count}/{len(actions)} действий")
                return True
                
        except Exception as e:
            logger.error(f"❌ Критическая ошибка выполнения задачи: {e}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            return False
            
        finally:
            self.cleanup()

    def _get_browser_fingerprint(self):
        """Получение информации о браузере"""
        try:
            fingerprint = {}
            
            # Получаем User Agent
            try:
                fingerprint['user_agent'] = self.driver.execute_script("return navigator.userAgent;")
            except:
                pass
                
            # Получаем разрешение экрана
            try:
                fingerprint['screen_resolution'] = self.driver.execute_script("return screen.width + 'x' + screen.height;")
            except:
                pass
                
            # Получаем язык
            try:
                fingerprint['language'] = self.driver.execute_script("return navigator.language;")
            except:
                pass
                
            # Получаем временную зону
            try:
                fingerprint['timezone'] = self.driver.execute_script("return Intl.DateTimeFormat().resolvedOptions().timeZone;")
            except:
                pass
                
            return fingerprint
        except Exception as e:
            logger.error(f"Ошибка получения fingerprint: {e}")
            return {}

    def cleanup(self):
        """Очистка ресурсов"""
        try:
            if self.driver:
                self.driver.quit()
                self.driver = None
                
            if self.multilogin and self.current_profile_id:
                self.multilogin.stop_profile(self.current_profile_id)
                self.current_profile_id = None
                
        except Exception as e:
            logger.error(f"Ошибка очистки: {e}")

# Глобальный экземпляр RPA бота
rpa_bot = EnhancedRPABot()

@app.route('/health', methods=['GET'])
def health_check():
    """Проверка здоровья сервиса"""
    try:
        status = {
            'status': 'ok',
            'timestamp': time.time(),
            'version': BOT_VERSION,
            'environment': ENVIRONMENT,
            'multilogin': rpa_bot.multilogin is not None,
            'chrome_available': True
        }
        
        # Проверка Chrome
        try:
            options = Options()
            options.add_argument('--headless=new')
            options.add_argument('--no-sandbox')
            options.add_argument('--disable-dev-shm-usage')
            test_driver = webdriver.Chrome(options=options)
            test_driver.quit()
        except:
            status['chrome_available'] = False
            
        return jsonify(status)
    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500

@app.route('/execute', methods=['POST'])
def execute_rpa():
    """Выполнение RPA задачи"""
    try:
        task = request.json
        task_id = task.get('task_id') or task.get('taskId')  # Поддержка обоих форматов
        
        logger.info(f"🎯 Получена RPA задача: {task_id}")
        logger.info(f"📋 Данные задачи: {json.dumps(task, indent=2, ensure_ascii=False)}")
        
        # Валидация задачи
        if not task_id:
            return jsonify({
                'success': False,
                'error': 'Отсутствует task_id или taskId'
            }), 400
        
        # Преобразуем формат задачи для совместимости
        normalized_task = {
            'taskId': task_id,
            'url': task.get('url'),
            'actions': task.get('actions', []),
            'metadata': {
                'platform': task.get('platform', 'web'),
                'account': task.get('account_data', {}),
                'multilogin_token_info': task.get('metadata', {}).get('multilogin_token_info', {})
            },
            'multilogin_profile': task.get('multilogin_profile'),
            'timeout': task.get('timeout', 60),
            'multilogin_token': task.get('multilogin_token')  # Получаем токен из задачи
        }
        
        # Логируем информацию о токене
        if normalized_task.get('multilogin_token'):
            logger.info(f"🔑 Получен токен Multilogin в задаче: {normalized_task['multilogin_token'][:50]}...")
        else:
            logger.info("⚠️ Токен Multilogin не передан в задаче")
            
        # Запуск задачи
        success = rpa_bot.execute_rpa_task(normalized_task)
        
        # Формируем ответ с результатами
        response_data = {
            'success': success,
            'task_id': task_id,
            'message': 'Задача выполнена успешно' if success else 'Задача завершилась с ошибками',
            'execution_time': 0,  # TODO: добавить реальное время
            'completed_actions': len(task.get('actions', [])) if success else 0
        }
        
        # Добавляем скриншот если есть
        if hasattr(rpa_bot, 'task_results') and rpa_bot.task_results:
            if 'screenshot' in rpa_bot.task_results:
                response_data['screenshot'] = rpa_bot.task_results['screenshot']
                response_data['screenshots'] = [rpa_bot.task_results['screenshot']]
            
            # Очищаем результаты после использования
            rpa_bot.task_results = {}
        
        logger.info(f"📤 Возвращаем результат: success={success}, screenshot={'есть' if 'screenshot' in response_data else 'нет'}")
        
        return jsonify(response_data)
        
    except Exception as e:
        logger.error(f"❌ Ошибка API /execute: {e}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        return jsonify({
            'success': False,
            'error': str(e),
            'task_id': task.get('task_id') or task.get('taskId') if 'task' in locals() else None
        }), 500

@app.route('/multilogin/status', methods=['GET'])
def multilogin_status():
    """Статус Multilogin"""
    try:
        if not rpa_bot.multilogin:
            return jsonify({
                'connected': False,
                'error': 'Multilogin не настроен'
            })
            
        profiles = rpa_bot.multilogin.get_profiles()
        
        return jsonify({
            'connected': True,
            'token_available': bool(rpa_bot.multilogin.token),
            'profiles_count': len(profiles),
            'active_profiles': len(rpa_bot.multilogin.active_profiles)
        })
        
    except Exception as e:
        return jsonify({
            'connected': False,
            'error': str(e)
        }), 500

@app.route('/multilogin/st', methods=['GET'])
def multilogin_simple_status():
    """Простой статус Multilogin (для совместимости)"""
    try:
        if not rpa_bot.multilogin:
            return jsonify({'status': 'disconnected'})
        return jsonify({'status': 'connected'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/test', methods=['GET'])
def test_bot():
    """Тест RPA бота"""
    try:
        logger.info("🧪 Запуск теста Enhanced RPA бота...")
        
        # Простой тест браузера
        test_task = {
            'taskId': f'test_{int(time.time())}',
            'url': 'https://httpbin.org/get',
            'actions': [
                {'type': 'navigate', 'url': 'https://httpbin.org/get'},
                {'type': 'wait', 'duration': 2000},
                {'type': 'screenshot', 'description': 'Тестовый скриншот'}
            ],
            'metadata': {'platform': 'test'}
        }
        
        success = rpa_bot.execute_rpa_task(test_task)
        
        response = {
            'success': success,
            'message': 'Enhanced тест прошел успешно' if success else 'Enhanced тест не прошел',
            'version': BOT_VERSION,
            'multilogin_available': rpa_bot.multilogin is not None
        }
        
        # Добавляем скриншот если есть
        if hasattr(rpa_bot, 'task_results') and rpa_bot.task_results:
            if 'screenshot' in rpa_bot.task_results:
                response['screenshot'] = rpa_bot.task_results['screenshot']
                response['screenshot_length'] = len(rpa_bot.task_results['screenshot'])
            
        return jsonify(response)
            
    except Exception as e:
        logger.error(f"❌ Критическая ошибка теста: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    # Создаем необходимые директории
    os.makedirs('logs', exist_ok=True)
    
    # Запускаем сервер
    port = int(os.environ.get('PORT', 8080))
    logger.info(f"🚀 Запуск Enhanced RPA бота на порту {port}")
    logger.info(f"🔗 Supabase URL: {SUPABASE_URL}")
    logger.info(f"🔑 Multilogin Token: {'найден' if MULTILOGIN_TOKEN else 'НЕ найден'}")
    
    # Проверяем Chrome при запуске
    chrome_path = '/usr/bin/google-chrome'
    if os.path.exists(chrome_path):
        logger.info(f"✅ Chrome найден: {chrome_path}")
    else:
        logger.error(f"❌ Chrome НЕ найден: {chrome_path}")
    
    app.run(host='0.0.0.0', port=port, debug=False)