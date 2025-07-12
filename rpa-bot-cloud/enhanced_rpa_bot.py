
#!/usr/bin/env python3
"""
Улучшенный RPA бот с интеграцией Multilogin
"""

import os
import sys
import logging
import traceback
from flask import Flask, request, jsonify
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait, Select
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains
from selenium.common.exceptions import TimeoutException, WebDriverException
import time
import json
import requests
import random
from multilogin_integration import MultiloginManager
from config import *

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

class EnhancedRPABot:
    def __init__(self):
        self.driver = None
        self.multilogin = None
        self.current_profile_id = None
        self.init_multilogin()
        
    def init_multilogin(self):
        """Инициализация Multilogin"""
        try:
            multilogin_token = os.getenv('MULTILOGIN_TOKEN')
            if multilogin_token:
                self.multilogin = MultiloginManager(multilogin_token)
                if self.multilogin.check_connection():
                    logger.info("✅ Multilogin успешно подключен")
                    self.multilogin.decode_token_info()
                else:
                    logger.warning("⚠️ Multilogin недоступен, будет использован обычный Chrome")
            else:
                logger.info("ℹ️ Токен Multilogin не найден, используется обычный Chrome")
        except Exception as e:
            logger.error(f"Ошибка инициализации Multilogin: {e}")

    def setup_chrome_driver(self, account_data=None, multilogin_token=None):
        """Настройка Chrome драйвера с антидетектом"""
        try:
            # Обновляем токен Multilogin если предоставлен
            if multilogin_token and multilogin_token != os.getenv('MULTILOGIN_TOKEN'):
                logger.info("🔄 Обновляем токен Multilogin из задачи")
                self.multilogin = MultiloginManager(multilogin_token)
                if self.multilogin.check_connection():
                    logger.info("✅ Multilogin подключен с новым токеном")
                    self.multilogin.decode_token_info()
                else:
                    logger.warning("⚠️ Новый токен Multilogin недействителен")
                    self.multilogin = None
            
            # Пробуем использовать Multilogin если доступен
            if self.multilogin and account_data:
                profile_id = self.multilogin.get_profile_for_account(account_data)
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
        """Настройка обычного Chrome с максимальным антидетектом"""
        options = Options()
        
        # Основные настройки
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--disable-gpu')
        options.add_argument('--disable-web-security')
        options.add_argument('--disable-blink-features=AutomationControlled')
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option('useAutomationExtension', False)
        
        # Антидетект настройки
        options.add_argument('--disable-extensions-except')
        options.add_argument('--disable-plugins-discovery')
        options.add_argument('--disable-bundled-ppapi-flash')
        options.add_argument('--disable-ipc-flooding-protection')
        options.add_argument('--enable-features=NetworkService,NetworkServiceLogging')
        options.add_argument('--disable-features=VizDisplayCompositor')
        
        # User Agent и окружение
        options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
        options.add_argument('--window-size=1920,1080')
        
        # Для Railway и облачных сред
        if os.getenv('RAILWAY_ENVIRONMENT') or os.getenv('HEROKU_APP_NAME'):
            options.add_argument('--headless=new')
            options.add_argument('--virtual-time-budget=60000')
            options.add_argument('--disable-background-timer-throttling')
            options.add_argument('--disable-renderer-backgrounding')
            options.add_argument('--disable-backgrounding-occluded-windows')
        
        # Прокси если есть
        proxy = get_random_proxy()
        if proxy:
            options.add_argument(f'--proxy-server={proxy}')
            
        try:
            # Попытка с локальным chromedriver
            driver = webdriver.Chrome(options=options)
        except Exception as e:
            try:
                # Попытка с системным Chrome
                chrome_bin = os.getenv('CHROME_BIN', '/usr/bin/google-chrome')
                options.binary_location = chrome_bin
                driver = webdriver.Chrome(options=options)
            except Exception as e2:
                logger.error(f"Не удалось запустить Chrome: {e2}")
                raise
        
        # Настройка антидетекта через JavaScript
        driver.execute_cdp_cmd('Page.addScriptToEvaluateOnNewDocument', {
            'source': '''
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined,
                });
                
                window.chrome = {
                    runtime: {},
                };
                
                Object.defineProperty(navigator, 'languages', {
                    get: () => ['en-US', 'en'],
                });
                
                Object.defineProperty(navigator, 'plugins', {
                    get: () => [1, 2, 3, 4, 5],
                });
            '''
        })
        
        return driver

    def human_like_action(self, action_type='click', duration=None):
        """Человекоподобные действия"""
        if duration is None:
            duration = random.uniform(MIN_ACTION_DELAY/1000, MAX_ACTION_DELAY/1000)
        time.sleep(duration)

    def human_like_type(self, element, text):
        """Человекоподобный ввод текста"""
        for char in text:
            element.send_keys(char)
            time.sleep(random.uniform(TYPING_SPEED_MIN, TYPING_SPEED_MAX))

    def find_element_by_selector(self, selector, timeout=10):
        """Поиск элемента по селектору"""
        try:
            return WebDriverWait(self.driver, timeout).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, selector))
            )
        except TimeoutException:
            logger.warning(f"⚠️ Элемент не найден: {selector}")
            return None

    def find_element_by_selectors(self, selectors, timeout=10):
        """Поиск элемента по списку селекторов"""
        for selector in selectors:
            element = self.find_element_by_selector(selector, timeout)
            if element:
                return element
        return None

    def click_element_by_selectors(self, selectors, action_name="элемент"):
        """Клик по элементу используя список селекторов"""
        element = self.find_element_by_selectors(selectors)
        if element:
            return self.human_click(element)
        else:
            logger.warning(f"⚠️ Не найден элемент для: {action_name}")
            return False

    def human_click(self, element):
        """Человекоподобный клик"""
        try:
            # Скролл к элементу
            self.driver.execute_script("arguments[0].scrollIntoView({behavior: 'smooth'});", element)
            time.sleep(random.uniform(0.5, 1.5))
            
            # Наведение мыши
            ActionChains(self.driver).move_to_element(element).perform()
            time.sleep(random.uniform(0.2, 0.8))
            
            # Клик
            ActionChains(self.driver).click(element).perform()
            self.human_like_action('click')
            return True
        except Exception as e:
            logger.error(f"❌ Ошибка клика: {e}")
            return False

    def random_interaction(self):
        """Случайное взаимодействие с контентом"""
        try:
            # Случайные действия во время прокрутки
            actions = [
                lambda: time.sleep(random.uniform(0.5, 2)),  # Пауза
                lambda: self.driver.execute_script(f"window.scrollBy(0, {random.randint(-50, 50)});"),  # Мини-скролл
                lambda: ActionChains(self.driver).move_by_offset(random.randint(-100, 100), random.randint(-100, 100)).perform()  # Движение мыши
            ]
            random.choice(actions)()
        except:
            pass

    def random_human_behavior(self):
        """Случайное человеческое поведение"""
        try:
            behaviors = [
                # Пауза и размышление
                lambda: time.sleep(random.uniform(2, 5)),
                
                # Случайная прокрутка
                lambda: self.driver.execute_script(f"window.scrollBy(0, {random.randint(-200, 200)});"),
                
                # Движение мыши
                lambda: ActionChains(self.driver).move_by_offset(
                    random.randint(-300, 300), 
                    random.randint(-300, 300)
                ).perform(),
                
                # Нажатие случайной безопасной клавиши
                lambda: ActionChains(self.driver).send_keys(" ").perform(),
                
                # Изменение размера окна (имитация пользователя)
                lambda: self.driver.set_window_size(
                    random.randint(1200, 1920),
                    random.randint(800, 1080)
                )
            ]
            
            # Выполняем 1-3 случайных действия
            for _ in range(random.randint(1, 3)):
                random.choice(behaviors)()
                time.sleep(random.uniform(0.5, 2))
                
            return True
        except Exception as e:
            logger.warning(f"⚠️ Ошибка случайного поведения: {e}")
            return True

    def execute_telegram_like(self, post_url, emoji='👍'):
        """Постановка лайка в Telegram"""
        try:
            logger.info(f"🎯 Переходим к Telegram посту: {post_url}")
            self.driver.get(post_url)
            
            # Ждем загрузки страницы
            WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.TAG_NAME, "body"))
            )
            
            self.human_like_action('wait', 3)
            
            # Ищем кнопку реакции
            possible_selectors = [
                f"//button[contains(@class, 'ReactionButton') and .//*[contains(text(), '{emoji}')]]",
                f"//button[.//*[contains(text(), '{emoji}')]]",
                f"//div[contains(@class, 'reaction') and contains(text(), '{emoji}')]",
                f"//span[contains(text(), '{emoji}')]/..",
                f"//*[contains(text(), '{emoji}')]"
            ]
            
            reaction_button = None
            for selector in possible_selectors:
                try:
                    reaction_button = WebDriverWait(self.driver, 5).until(
                        EC.element_to_be_clickable((By.XPATH, selector))
                    )
                    logger.info(f"✅ Найдена кнопка реакции: {selector}")
                    break
                except TimeoutException:
                    continue
            
            if not reaction_button:
                logger.warning("⚠️ Кнопка реакции не найдена, пробуем другой подход")
                
                # Пробуем найти любую интерактивную кнопку
                buttons = self.driver.find_elements(By.TAG_NAME, "button")
                for button in buttons:
                    try:
                        if emoji in button.get_attribute('innerHTML'):
                            reaction_button = button
                            break
                    except:
                        continue
            
            if reaction_button:
                # Скроллим к кнопке
                self.driver.execute_script("arguments[0].scrollIntoView(true);", reaction_button)
                self.human_like_action('scroll', 1)
                
                # Кликаем
                ActionChains(self.driver).move_to_element(reaction_button).click().perform()
                self.human_like_action('click', 2)
                
                # Проверяем результат
                try:
                    WebDriverWait(self.driver, 5).until(
                        EC.presence_of_element_located((By.CSS_SELECTOR, ".ReactionButton--chosen, .reaction-chosen, .active"))
                    )
                    logger.info("✅ Лайк успешно поставлен!")
                    return True
                except TimeoutException:
                    logger.info("ℹ️ Лайк поставлен (подтверждение не найдено)")
                    return True
                    
            else:
                logger.error("❌ Не удалось найти кнопку реакции")
                return False
                
        except Exception as e:
            logger.error(f"❌ Ошибка постановки лайка: {e}")
            return False

    def execute_action(self, action):
        """Выполнение действия"""
        try:
            action_type = action.get('type')
            logger.info(f"🎬 Выполняем действие: {action_type}")
            
            if action_type == 'navigate':
                url = action.get('url')
                logger.info(f"🌐 Переход на: {url}")
                self.driver.get(url)
                self.human_like_action('navigate', 2)
                
            elif action_type == 'wait':
                duration = action.get('duration', 2000) / 1000
                logger.info(f"⏱️ Ожидание {duration} сек")
                time.sleep(duration)
                
            elif action_type == 'telegram_like':
                emoji = action.get('emoji', '👍')
                post_url = action.get('url') or self.driver.current_url
                return self.execute_telegram_like(post_url, emoji)
                
            elif action_type == 'click':
                selector = action.get('selector')
                element = WebDriverWait(self.driver, 10).until(
                    EC.element_to_be_clickable((By.CSS_SELECTOR, selector))
                )
                ActionChains(self.driver).move_to_element(element).click().perform()
                self.human_like_action('click')
                
            elif action_type == 'type':
                selector = action.get('selector')
                text = action.get('text', '')
                element = WebDriverWait(self.driver, 10).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, selector))
                )
                if action.get('clearFirst', True):
                    element.clear()
                self.human_like_type(element, text)
                
            elif action_type == 'scroll':
                x = action.get('x', 0)
                y = action.get('y', 500)
                self.driver.execute_script(f"window.scrollBy({x}, {y});")
                self.human_like_action('scroll')
                
            elif action_type == 'check_element':
                selector = action.get('selector')
                try:
                    WebDriverWait(self.driver, 5).until(
                        EC.presence_of_element_located((By.CSS_SELECTOR, selector))
                    )
                    logger.info(f"✅ Элемент найден: {selector}")
                    return True
                except TimeoutException:
                    logger.warning(f"⚠️ Элемент не найден: {selector}")
                    return False
                    
            elif action_type == 'screenshot':
                """Создание скриншота"""
                logger.info("📸 Создание скриншота страницы")
                try:
                    # Делаем скриншот
                    screenshot_path = f"/tmp/screenshot_{int(time.time())}.png"
                    self.driver.save_screenshot(screenshot_path)
                    
                    # Конвертируем в base64
                    import base64
                    with open(screenshot_path, "rb") as img_file:
                        screenshot_base64 = base64.b64encode(img_file.read()).decode('utf-8')
                    
                    # Сохраняем скриншот в результаты задачи
                    if not hasattr(self, 'task_results'):
                        self.task_results = {}
                    
                    self.task_results['screenshot'] = f"data:image/png;base64,{screenshot_base64}"
                    self.task_results['screenshot_path'] = screenshot_path
                    
                    logger.info(f"✅ Скриншот создан и сохранен: {len(screenshot_base64)} байт")
                    
                    # Удаляем временный файл
                    import os
                    try:
                        os.remove(screenshot_path)
                    except:
                        pass
                        
                    return True
                except Exception as e:
                    logger.error(f"❌ Ошибка создания скриншота: {e}")
                    return False
                    
            # =================== СОЦИАЛЬНЫЕ ДЕЙСТВИЯ ===================
            elif action_type == 'like' or action_type == 'heart':
                """Лайк/сердечко на любой платформе"""
                logger.info("❤️ Ставим лайк")
                selectors = action.get('selectors', [
                    '[data-testid="like"]', '[aria-label*="like" i]', '[aria-label*="лайк" i]',
                    '.like-button', '.heart-button', '[data-action="like"]',
                    'button[title*="like" i]', '.btn-like', '[role="button"][aria-label*="like" i]'
                ])
                return self.click_element_by_selectors(selectors, "лайк")
                
            elif action_type == 'follow' or action_type == 'subscribe':
                """Подписка на аккаунт/канал"""
                logger.info("👥 Подписываемся")
                selectors = action.get('selectors', [
                    '[data-testid="follow"]', '[aria-label*="follow" i]', '[aria-label*="подпис" i]',
                    '.follow-button', '.subscribe-button', '[data-action="follow"]',
                    'button[title*="follow" i]', 'button[title*="subscribe" i]',
                    '.btn-follow', '.btn-subscribe', '#subscribe-button'
                ])
                return self.click_element_by_selectors(selectors, "подписка")
                
            elif action_type == 'comment':
                """Написание комментария"""
                logger.info("💬 Пишем комментарий")
                comment_text = action.get('text', 'Great post! 👍')
                comment_selectors = action.get('comment_selectors', [
                    '[data-testid="comment"]', '[placeholder*="comment" i]', '[placeholder*="коммент" i]',
                    '.comment-input', 'textarea[placeholder*="write" i]', '[data-action="comment"]'
                ])
                
                # Находим поле для комментария
                comment_field = self.find_element_by_selectors(comment_selectors)
                if comment_field:
                    self.human_like_type(comment_field, comment_text)
                    
                    # Ищем кнопку отправки
                    submit_selectors = [
                        '[data-testid="reply"]', 'button[type="submit"]', '.submit-comment',
                        'button[aria-label*="post" i]', 'button[title*="post" i]', '.btn-submit'
                    ]
                    return self.click_element_by_selectors(submit_selectors, "отправка комментария")
                return False
                
            elif action_type == 'share':
                """Поделиться постом"""
                logger.info("📤 Делимся постом")
                selectors = action.get('selectors', [
                    '[data-testid="share"]', '[aria-label*="share" i]', '[aria-label*="поделиться" i]',
                    '.share-button', '[data-action="share"]', 'button[title*="share" i]'
                ])
                return self.click_element_by_selectors(selectors, "поделиться")
                
            elif action_type == 'view_story':
                """Просмотр истории"""
                logger.info("👁️ Просматриваем истории")
                selectors = action.get('selectors', [
                    '[data-testid="story"]', '.story-ring', '.story-avatar', 
                    '[aria-label*="story" i]', '.stories-container img'
                ])
                element = self.find_element_by_selectors(selectors)
                if element:
                    self.human_click(element)
                    # Ждем загрузки истории
                    time.sleep(random.uniform(3, 8))
                    return True
                return False
                
            elif action_type == 'watch_video':
                """Просмотр видео"""
                logger.info("🎥 Смотрим видео")
                duration = action.get('duration', random.uniform(10, 30))
                
                # Найти и запустить видео
                video_selectors = ['video', '.video-player', '[data-testid="video"]']
                video = self.find_element_by_selectors(video_selectors)
                if video:
                    # Кликаем для начала воспроизведения
                    self.human_click(video)
                    
                    # Имитируем просмотр
                    watch_time = 0
                    while watch_time < duration:
                        pause_time = random.uniform(2, 5)
                        time.sleep(pause_time)
                        watch_time += pause_time
                        
                        # Случайные действия во время просмотра
                        if random.random() < 0.1:  # 10% шанс прокрутки
                            self.driver.execute_script(f"window.scrollBy(0, {random.randint(-100, 100)});")
                    
                    logger.info(f"✅ Видео просмотрено {duration:.1f} сек")
                    return True
                return False
                
            # =================== НАВИГАЦИЯ И ВЗАИМОДЕЙСТВИЕ ===================
            elif action_type == 'hover':
                """Наведение мыши на элемент"""
                logger.info("🖱️ Наводим мышь")
                selector = action.get('selector')
                element = self.find_element_by_selector(selector)
                if element:
                    ActionChains(self.driver).move_to_element(element).perform()
                    time.sleep(random.uniform(0.5, 2))
                    return True
                return False
                
            elif action_type == 'double_click':
                """Двойной клик"""
                logger.info("🖱️🖱️ Двойной клик")
                selector = action.get('selector')
                element = self.find_element_by_selector(selector)
                if element:
                    ActionChains(self.driver).double_click(element).perform()
                    self.human_like_action('double_click')
                    return True
                return False
                
            elif action_type == 'right_click':
                """Правый клик"""
                logger.info("🖱️➡️ Правый клик")
                selector = action.get('selector')
                element = self.find_element_by_selector(selector)
                if element:
                    ActionChains(self.driver).context_click(element).perform()
                    self.human_like_action('right_click')
                    return True
                return False
                
            elif action_type == 'drag_and_drop':
                """Перетаскивание"""
                logger.info("🤏 Перетаскиваем элемент")
                source_selector = action.get('source_selector')
                target_selector = action.get('target_selector')
                
                source = self.find_element_by_selector(source_selector)
                target = self.find_element_by_selector(target_selector)
                
                if source and target:
                    ActionChains(self.driver).drag_and_drop(source, target).perform()
                    self.human_like_action('drag_drop')
                    return True
                return False
                
            elif action_type == 'scroll_to_element':
                """Прокрутка к элементу"""
                logger.info("🔄 Прокручиваем к элементу")
                selector = action.get('selector')
                element = self.find_element_by_selector(selector)
                if element:
                    self.driver.execute_script("arguments[0].scrollIntoView({behavior: 'smooth'});", element)
                    time.sleep(random.uniform(1, 3))
                    return True
                return False
                
            elif action_type == 'infinite_scroll':
                """Бесконечная прокрутка (лента)"""
                logger.info("♾️ Бесконечная прокрутка ленты")
                scroll_count = action.get('count', random.randint(3, 10))
                
                for i in range(scroll_count):
                    # Прокрутка вниз
                    scroll_height = random.randint(300, 800)
                    self.driver.execute_script(f"window.scrollBy(0, {scroll_height});")
                    
                    # Случайная пауза
                    pause_time = random.uniform(1, 4)
                    time.sleep(pause_time)
                    
                    # Случайное взаимодействие с контентом
                    if random.random() < 0.3:  # 30% шанс взаимодействия
                        self.random_interaction()
                
                logger.info(f"✅ Выполнено {scroll_count} прокруток")
                return True
                
            # =================== РАБОТА С ФОРМАМИ ===================
            elif action_type == 'select_option':
                """Выбор опции в dropdown"""
                logger.info("📋 Выбираем опцию")
                selector = action.get('selector')
                option_value = action.get('value')
                
                select_element = Select(self.find_element_by_selector(selector))
                if option_value:
                    select_element.select_by_value(option_value)
                    self.human_like_action('select')
                    return True
                return False
                
            elif action_type == 'upload_file':
                """Загрузка файла"""
                logger.info("📁 Загружаем файл")
                selector = action.get('selector', 'input[type="file"]')
                file_path = action.get('file_path')
                
                if file_path:
                    element = self.find_element_by_selector(selector)
                    if element:
                        element.send_keys(file_path)
                        time.sleep(random.uniform(2, 5))
                        return True
                return False
                
            elif action_type == 'clear_and_type':
                """Очистка и ввод текста"""
                logger.info("🧹 Очищаем и вводим текст")
                selector = action.get('selector')
                text = action.get('text', '')
                
                element = self.find_element_by_selector(selector)
                if element:
                    element.clear()
                    time.sleep(random.uniform(0.3, 1))
                    self.human_like_type(element, text)
                    return True
                return False
                
            # =================== СПЕЦИАЛЬНЫЕ ДЕЙСТВИЯ ===================
            elif action_type == 'switch_tab':
                """Переключение вкладки"""
                logger.info("🔄 Переключаем вкладку")
                tab_index = action.get('tab_index', -1)  # -1 = последняя вкладка
                
                tabs = self.driver.window_handles
                if abs(tab_index) <= len(tabs):
                    self.driver.switch_to.window(tabs[tab_index])
                    time.sleep(random.uniform(1, 2))
                    return True
                return False
                
            elif action_type == 'new_tab':
                """Открытие новой вкладки"""
                logger.info("🆕 Открываем новую вкладку")
                url = action.get('url', 'about:blank')
                
                self.driver.execute_script(f"window.open('{url}', '_blank');")
                # Переключаемся на новую вкладку
                self.driver.switch_to.window(self.driver.window_handles[-1])
                time.sleep(random.uniform(2, 4))
                return True
                
            elif action_type == 'close_tab':
                """Закрытие вкладки"""
                logger.info("❌ Закрываем вкладку")
                self.driver.close()
                
                # Переключаемся на предыдущую вкладку если есть
                if len(self.driver.window_handles) > 0:
                    self.driver.switch_to.window(self.driver.window_handles[-1])
                return True
                
            elif action_type == 'press_key':
                """Нажатие клавиши"""
                logger.info("⌨️ Нажимаем клавишу")
                key = action.get('key', 'RETURN')
                
                from selenium.webdriver.common.keys import Keys
                key_mapping = {
                    'ENTER': Keys.RETURN,
                    'ESCAPE': Keys.ESCAPE,
                    'TAB': Keys.TAB,
                    'SPACE': Keys.SPACE,
                    'DELETE': Keys.DELETE,
                    'BACKSPACE': Keys.BACKSPACE,
                    'ARROW_UP': Keys.ARROW_UP,
                    'ARROW_DOWN': Keys.ARROW_DOWN,
                    'ARROW_LEFT': Keys.ARROW_LEFT,
                    'ARROW_RIGHT': Keys.ARROW_RIGHT
                }
                
                target = action.get('selector')
                if target:
                    element = self.find_element_by_selector(target)
                    if element:
                        element.send_keys(key_mapping.get(key, key))
                else:
                    ActionChains(self.driver).send_keys(key_mapping.get(key, key)).perform()
                
                self.human_like_action('key_press')
                return True
                
            elif action_type == 'execute_js':
                """Выполнение JavaScript"""
                logger.info("🔧 Выполняем JavaScript")
                script = action.get('script', '')
                if script:
                    result = self.driver.execute_script(script)
                    logger.info(f"JS результат: {result}")
                    return True
                return False
                
            elif action_type == 'random_human_behavior':
                """Случайное человеческое поведение"""
                logger.info("🎭 Имитируем человеческое поведение")
                return self.random_human_behavior()
                
            return True
            
        except Exception as e:
            logger.error(f"❌ Ошибка выполнения действия {action_type}: {e}")
            return False

    def execute_rpa_task(self, task):
        """Выполнение RPA задачи"""
        task_id = task.get('taskId')
        logger.info(f"🚀 Запуск RPA задачи: {task_id}")
        
        # Уведомляем о начале выполнения
        self.update_task_status(task_id, 'processing', 'Запуск RPA задачи')
        
        try:
            # Подготовка данных аккаунта
            account_data = {
                'username': task.get('accountId', 'test-account'),
                'platform': task.get('metadata', {}).get('platform', 'web')
            }
            
            # Получение токена Multilogin из задачи
            multilogin_token = None
            if task.get('metadata', {}).get('multilogin_token_info'):
                # Ищем токен в разных местах
                token_info = task.get('metadata', {}).get('multilogin_token_info', {})
                multilogin_token = token_info.get('token')
                
                if not multilogin_token:
                    # Пробуем достать из environment переменной MULTILOGIN_TOKEN
                    multilogin_token = os.getenv('MULTILOGIN_TOKEN')
                    
                logger.info(f"🔑 Используем токен Multilogin: {'найден' if multilogin_token else 'не найден'}")
            
            # Инициализация результатов задачи
            self.task_results = {}
            
            # Настройка браузера с токеном Multilogin
            self.driver = self.setup_chrome_driver(account_data, multilogin_token)
            
            # Переход на начальную страницу
            initial_url = task.get('url')
            if initial_url:
                logger.info(f"🌐 Переход на начальную страницу: {initial_url}")
                self.driver.get(initial_url)
                time.sleep(3)
            
            # Выполнение действий
            actions = task.get('actions', [])
            success_count = 0
            
            for i, action in enumerate(actions):
                logger.info(f"📝 Действие {i+1}/{len(actions)}: {action.get('type')}")
                
                if self.execute_action(action):
                    success_count += 1
                    self.update_task_status(
                        task_id, 
                        'processing', 
                        f'Выполнено {success_count}/{len(actions)} действий'
                    )
                else:
                    logger.warning(f"⚠️ Действие {i+1} выполнено с предупреждением")
            
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
                self.update_task_status(
                    task_id, 
                    'completed', 
                    'Задача выполнена успешно',
                    result_data
                )
                return True
            else:
                logger.info(f"⚠️ Выполнено {success_count}/{len(actions)} действий")
                result_data['success'] = False
                result_data['warning'] = f'Выполнено частично ({success_count}/{len(actions)})'
                self.update_task_status(
                    task_id, 
                    'completed', 
                    f'Задача выполнена частично ({success_count}/{len(actions)})',
                    result_data
                )
                return True
                
        except Exception as e:
            logger.error(f"❌ Критическая ошибка выполнения задачи: {e}")
            self.update_task_status(
                task_id, 
                'failed', 
                f'Ошибка выполнения: {str(e)}',
                {'success': False, 'error': str(e)}
            )
            return False
            
        finally:
            self.cleanup()

    def update_task_status(self, task_id, status, message, result_data=None):
        """Обновление статуса задачи в Supabase"""
        try:
            supabase_url = os.getenv('SUPABASE_URL')
            supabase_key = os.getenv('SUPABASE_SERVICE_KEY')
            
            if not supabase_url or not supabase_key:
                logger.warning("Supabase не настроен для обновления статуса")
                return
                
            headers = {
                'apikey': supabase_key,
                'Authorization': f'Bearer {supabase_key}',
                'Content-Type': 'application/json'
            }
            
            update_data = {
                'status': status,
                'updated_at': 'now()'
            }
            
            if result_data:
                update_data['result_data'] = result_data
            
            response = requests.patch(
                f"{supabase_url}/rest/v1/rpa_tasks?task_id=eq.{task_id}",
                headers=headers,
                json=update_data,
                timeout=10
            )
            
            if response.status_code == 204:
                logger.info(f"✅ Статус задачи обновлен: {status} - {message}")
            else:
                logger.error(f"❌ Ошибка обновления статуса: {response.status_code}")
                
        except Exception as e:
            logger.error(f"❌ Ошибка обновления статуса в Supabase: {e}")

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
            'timeout': task.get('timeout', 60)
        }
            
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
            
        token_info = rpa_bot.multilogin.decode_token_info()
        profiles = rpa_bot.multilogin.get_profiles()
        
        return jsonify({
            'connected': True,
            'workspace_id': token_info.get('workspaceID'),
            'email': token_info.get('email'),
            'plan': token_info.get('planName'),
            'profiles_count': len(profiles),
            'active_profiles': len(rpa_bot.multilogin.active_profiles)
        })
        
    except Exception as e:
        return jsonify({
            'connected': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    import traceback
    
    logger.info("🚀 Запуск Enhanced RPA Bot с Multilogin")
    
    # Проверка Multilogin при запуске
    if rpa_bot.multilogin:
        logger.info("✅ Multilogin интеграция активна")
    else:
        logger.info("ℹ️ Работает в режиме обычного Chrome")
    
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port, debug=False)
