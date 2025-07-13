
#!/usr/bin/env python3
"""
Продвинутый облачный RPA бот с антидетектом, Vision кэшем и автообучением
"""

import time
import logging
import os
import json
from datetime import datetime
from typing import Dict, List, Optional, Any

from antidetect_browser import AntiDetectBrowser
from vision_client import VisionClient
from vision_cache import VisionCache
from action_handlers import ActionHandlers
from telegram_handler import TelegramHandler
from human_behavior import CloudHumanBehaviorSimulator

logger = logging.getLogger(__name__)

class AdvancedCloudRPABot:
    def __init__(self):
        self.antidetect_browser = AntiDetectBrowser()
        self.vision_client = VisionClient()
        self.vision_cache = VisionCache()
        self.behavior = CloudHumanBehaviorSimulator()
        self.action_handlers = None
        self.telegram_handler = None
        self.current_session_stats = {
            'cache_hits': 0,
            'vision_calls': 0,
            'successful_actions': 0,
            'failed_actions': 0
        }
        
        # Создание необходимых директорий
        os.makedirs('screenshots', exist_ok=True)
        os.makedirs('logs', exist_ok=True)
        os.makedirs('cache_errors', exist_ok=True)
        
        logger.info("Продвинутый облачный RPA бот инициализирован")
    
    def setup_browser(self, headless=False, proxy=None):
        """Настройка антидетект браузера"""
        logger.info("Настройка антидетект браузера...")
        
        success = self.antidetect_browser.setup_browser(headless, proxy)
        if success:
            self.action_handlers = ActionHandlers(
                self.antidetect_browser.driver, 
                self.antidetect_browser.wait, 
                self.behavior
            )
            self.telegram_handler = TelegramHandler(
                self.antidetect_browser.driver,
                self.antidetect_browser.wait,
                self.behavior
            )
            logger.info("Антидетект браузер настроен успешно")
        else:
            logger.error("Не удалось настроить антидетект браузер")
        
        return success
    
    def get_element_with_vision(self, url: str, element_description: str, 
                              force_refresh: bool = False) -> Optional[Dict]:
        """Получение элемента с использованием Vision API и кэширования"""
        
        # Проверяем кэш (если не принудительное обновление)
        if not force_refresh:
            cached_element = self.vision_cache.get_cached_element(url, element_description)
            if cached_element and cached_element['confidence'] > 0.7:
                logger.info(f"Элемент найден в кэше: {element_description}")
                self.current_session_stats['cache_hits'] += 1
                return cached_element
        
        # Делаем скриншот для Vision API
        screenshot_path = f"screenshots/vision_{int(time.time())}.png"
        if not self.antidetect_browser.take_screenshot(screenshot_path):
            logger.error("Не удалось создать скриншот для Vision API")
            return None
        
        # Анализ с помощью Vision API
        logger.info(f"Отправка запроса в Vision API для: {element_description}")
        self.current_session_stats['vision_calls'] += 1
        
        try:
            with open(screenshot_path, 'rb') as f:
                screenshot_data = f.read()
            
            screenshot_hash = self.vision_cache.get_screenshot_hash(screenshot_data)
            vision_result = self.vision_client.analyze_screenshot(screenshot_path, element_description)
            
            if vision_result.get('found') and vision_result.get('coordinates'):
                # Сохраняем успешный результат в кэш
                self.vision_cache.save_element_cache(
                    url, element_description,
                    coordinates=vision_result['coordinates'],
                    selector=vision_result.get('selector'),
                    screenshot_hash=screenshot_hash
                )
                
                return {
                    'coordinates': vision_result['coordinates'],
                    'selector': vision_result.get('selector'),
                    'confidence': vision_result.get('confidence', 0.8),
                    'description': vision_result.get('description', ''),
                    'success_count': 0,
                    'fail_count': 0
                }
            else:
                logger.warning(f"Vision API не смог найти элемент: {element_description}")
                logger.warning(f"Ответ Vision API: {vision_result}")
                return None
                
        except Exception as e:
            logger.error(f"Ошибка работы с Vision API: {e}")
            return None
        finally:
            # Удаляем временный скриншот
            try:
                os.remove(screenshot_path)
            except:
                pass
    
    def smart_click(self, url: str, element_description: str, max_retries: int = 2) -> bool:
        """Умный клик с использованием кэша и автообучения"""
        
        for attempt in range(max_retries + 1):
            force_refresh = attempt > 0  # Первая попытка - из кэша, следующие - новый анализ
            
            # Получаем элемент (из кэша или через Vision API)
            element_info = self.get_element_with_vision(url, element_description, force_refresh)
            
            if not element_info:
                logger.error(f"Не удалось найти элемент: {element_description}")
                continue
            
            # Попытка клика
            success = False
            coordinates = element_info.get('coordinates')
            selector = element_info.get('selector')
            
            try:
                # Сначала пробуем по селектору (если есть)
                if selector and not force_refresh:
                    try:
                        element = self.antidetect_browser.driver.find_element('css selector', selector)
                        self.antidetect_browser.driver.execute_script("arguments[0].click();", element)
                        success = True
                        logger.info(f"Клик по селектору успешен: {selector}")
                    except Exception as e:
                        logger.warning(f"Клик по селектору не удался: {e}")
                
                # Если селектор не сработал, кликаем по координатам
                if not success and coordinates:
                    success = self.antidetect_browser.human_click(coordinates)
                    if success:
                        logger.info(f"Клик по координатам успешен: {coordinates}")
                
                if success:
                    # Обновляем статистику успеха в кэше
                    self.vision_cache.update_element_success(url, element_description, True)
                    self.current_session_stats['successful_actions'] += 1
                    
                    # Логируем успешную операцию
                    self.vision_cache.log_operation(
                        url, 'click', element_description, True,
                        coordinates=coordinates, 
                        execution_time=time.time() * 1000
                    )
                    
                    return True
                else:
                    # Обновляем статистику неудачи
                    self.vision_cache.update_element_success(url, element_description, False)
                    
            except Exception as e:
                logger.error(f"Ошибка клика (попытка {attempt + 1}): {e}")
                self.vision_cache.update_element_success(url, element_description, False)
                
                # Сохраняем скриншот ошибки для анализа
                error_screenshot = f"cache_errors/error_{int(time.time())}_{element_description.replace(' ', '_')}.png"
                self.antidetect_browser.take_screenshot(error_screenshot)
                
                # Логируем неудачную операцию
                self.vision_cache.log_operation(
                    url, 'click', element_description, False,
                    error_message=str(e),
                    screenshot_path=error_screenshot,
                    coordinates=coordinates,
                    execution_time=time.time() * 1000
                )
        
        self.current_session_stats['failed_actions'] += 1
        logger.error(f"Все попытки клика неуспешны для: {element_description}")
        return False
    
    def execute_action(self, action: Dict) -> bool:
        """Выполнение действия с улучшенной логикой"""
        action_type = action.get('type')
        url = self.antidetect_browser.driver.current_url if self.antidetect_browser.driver else "unknown"
        
        logger.info(f"Выполнение продвинутого действия: {action_type}")
        
        try:
            if action_type == 'navigate':
                success = self.antidetect_browser.human_navigate(action.get('url', ''))
                return success
                
            elif action_type == 'click':
                element_description = action.get('selector', action.get('description', 'button'))
                return self.smart_click(url, element_description)
                
            elif action_type == 'type':
                return self.action_handlers.type_text(action)
                
            elif action_type == 'wait':
                wait_time = action.get('duration', 1000)
                self.behavior.random_delay(wait_time, wait_time + 500)
                return True
                
            elif action_type == 'scroll':
                direction = action.get('direction', 'down')
                amount = action.get('amount', 300)
                
                if direction == 'down':
                    self.antidetect_browser.driver.execute_script(f"window.scrollBy(0, {amount});")
                else:
                    self.antidetect_browser.driver.execute_script(f"window.scrollBy(0, -{amount});")
                
                self.behavior.random_delay(500, 1500)
                return True
                
            elif action_type == 'telegram_like':
                return self.telegram_handler.telegram_like(action)
                
            elif action_type == 'clear_cache':
                # Специальное действие для очистки кэша
                clear_url = action.get('url', url)
                self.vision_cache.clear_cache_for_url(clear_url)
                logger.info(f"Кэш очищен для URL: {clear_url}")
                return True
                
            else:
                logger.warning(f"Неизвестный тип действия: {action_type}")
                return False
                
        except Exception as e:
            logger.error(f"Ошибка выполнения продвинутого действия {action_type}: {e}")
            return False
    
    def execute_task(self, task: Dict) -> Dict:
        """Выполнение полной задачи с продвинутой логикой"""
        start_time = time.time()
        task_id = task.get('taskId', f'task_{int(time.time())}')
        completed_actions = 0
        
        # Сброс статистики сессии
        self.current_session_stats = {
            'cache_hits': 0,
            'vision_calls': 0,
            'successful_actions': 0,
            'failed_actions': 0
        }
        
        logger.info(f"Начало выполнения продвинутой задачи: {task_id}")
        
        try:
            # Настройка браузера
            proxy = task.get('proxy')
            headless = task.get('headless', False)  # По умолчанию НЕ headless для антидетекта
            
            if not self.setup_browser(headless, proxy):
                raise Exception("Не удалось настроить продвинутый браузер")
            
            # Переход на стартовую страницу
            if task.get('url'):
                if not self.antidetect_browser.human_navigate(task['url']):
                    raise Exception(f"Не удалось перейти на {task['url']}")
            
            actions = task.get('actions', [])
            
            # Выполнение действий
            for i, action in enumerate(actions):
                logger.info(f"Выполнение действия {i+1}/{len(actions)}: {action.get('type')}")
                
                if self.execute_action(action):
                    completed_actions += 1
                    logger.info(f"Действие {i+1} выполнено успешно")
                else:
                    logger.warning(f"Действие {i+1} не выполнено: {action}")
                
                # Человекоподобная задержка между действиями
                self.behavior.random_delay(1000, 3000)
                
                # Проверка таймаута
                if time.time() - start_time > task.get('timeout', 120000) / 1000:
                    raise Exception("Превышен таймаут выполнения задачи")
            
            execution_time = int((time.time() - start_time) * 1000)
            
            # Финальный скриншот
            screenshot_path = f"screenshots/final_{task_id}_{int(time.time())}.png"
            self.antidetect_browser.take_screenshot(screenshot_path)
            
            # Конвертируем скриншот в base64
            screenshot_base64 = None
            try:
                import base64
                with open(screenshot_path, "rb") as screenshot_file:
                    screenshot_base64 = base64.b64encode(screenshot_file.read()).decode('utf-8')
                logger.info(f"Скриншот конвертирован в base64: {len(screenshot_base64)} символов")
            except Exception as e:
                logger.error(f"Ошибка конвертации скриншота в base64: {e}")
            
            # Получение статистики кэша
            cache_stats = self.vision_cache.get_cache_stats()
            
            # Успешный результат
            result = {
                'taskId': task_id,
                'success': True,
                'message': f'Продвинутая задача выполнена. Завершено {completed_actions}/{len(actions)} действий',
                'executionTime': execution_time,
                'completedActions': completed_actions,
                'screenshot': screenshot_base64,
                'data': {
                    'url': self.antidetect_browser.driver.current_url,
                    'title': self.antidetect_browser.driver.title
                },
                'stats': {
                    'session': self.current_session_stats,
                    'cache': cache_stats
                },
                'environment': 'railway-advanced-rpa'
            }
            
            logger.info(f"Продвинутая задача {task_id} выполнена за {execution_time}мс")
            logger.info(f"Статистика: кэш-хиты={self.current_session_stats['cache_hits']}, "
                       f"Vision вызовы={self.current_session_stats['vision_calls']}")
            
            return result
            
        except Exception as e:
            execution_time = int((time.time() - start_time) * 1000)
            
            # Скриншот ошибки
            error_screenshot_path = f"cache_errors/task_error_{task_id}_{int(time.time())}.png"
            error_screenshot_base64 = None
            try:
                self.antidetect_browser.take_screenshot(error_screenshot_path)
                # Конвертируем в base64
                import base64
                with open(error_screenshot_path, "rb") as error_file:
                    error_screenshot_base64 = base64.b64encode(error_file.read()).decode('utf-8')
            except Exception as screenshot_error:
                logger.warning(f"Не удалось создать скриншот ошибки: {screenshot_error}")
            
            # Результат с ошибкой
            result = {
                'taskId': task_id,
                'success': False,
                'message': 'Ошибка выполнения продвинутой задачи',
                'error': str(e),
                'executionTime': execution_time,
                'completedActions': completed_actions,
                'screenshot': error_screenshot_base64,
                'stats': {
                    'session': self.current_session_stats,
                    'cache': self.vision_cache.get_cache_stats()
                },
                'environment': 'railway-advanced-rpa'
            }
            
            logger.error(f"Ошибка выполнения продвинутой задачи {task_id}: {e}")
            return result
            
        finally:
            # Очистка ресурсов
            try:
                self.antidetect_browser.close()
            except Exception as e:
                logger.warning(f"Ошибка закрытия браузера: {e}")
    
    def clear_cache_for_url(self, url: str):
        """Очистка кэша для конкретного URL"""
        self.vision_cache.clear_cache_for_url(url)
        logger.info(f"Кэш очищен для URL: {url}")
    
    def get_cache_stats(self) -> Dict:
        """Получение статистики кэша"""
        return self.vision_cache.get_cache_stats()
    
    def test_vision_connection(self) -> bool:
        """Тест подключения к Vision API"""
        return self.vision_client.test_connection()
