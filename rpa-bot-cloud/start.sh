
#!/bin/bash
# Продвинутый скрипт запуска для Railway

echo "🚀 Запуск продвинутого Cloud RPA Bot на Railway..."

# Проверка переменных окружения
if [ -z "$SUPABASE_URL" ]; then
    echo "❌ Переменная SUPABASE_URL не установлена"
    exit 1
fi

if [ -z "$SUPABASE_SERVICE_KEY" ]; then
    echo "⚠️  Переменная SUPABASE_SERVICE_KEY не установлена"
    echo "Бот будет работать без отправки результатов в Supabase"
fi

# Проверка дополнительных переменных
if [ -n "$ANTICAPTCHA_KEY" ]; then
    echo "✅ AntiCaptcha ключ настроен"
else
    echo "⚠️  AntiCaptcha ключ не настроен - решение капчи недоступно"
fi

# Запуск виртуального дисплея
echo "🖥️  Запуск виртуального дисплея..."
Xvfb :99 -screen 0 1920x1080x24 -ac +extension GLX +render -noreset &
export DISPLAY=:99

# Запуск window manager для GUI приложений
echo "🪟 Запуск window manager..."
fluxbox &

# Ожидание готовности дисплея
sleep 5

# Проверка Chrome
echo "🌐 Проверка Google Chrome..."
if google-chrome --version; then
    echo "✅ Chrome установлен успешно"
    CHROME_VERSION=$(google-chrome --version)
    echo "   Версия: $CHROME_VERSION"
else
    echo "❌ Chrome не найден"
    exit 1
fi

# Проверка Python зависимостей
echo "🐍 Проверка Python зависимостей..."
python -c "import selenium, undetected_chromedriver, fake_useragent" || {
    echo "❌ Не все Python зависимости установлены"
    exit 1
}

# Создание необходимых директорий
echo "📁 Создание директорий..."
mkdir -p screenshots logs profiles extensions

# Настройка прав доступа
chmod +x rpa_bot_cloud.py

# Проверка системных ресурсов
echo "💾 Проверка системных ресурсов..."
echo "   Память: $(free -h | grep '^Mem:' | awk '{print $3 "/" $2}')"
echo "   Диск: $(df -h / | tail -1 | awk '{print $3 "/" $2 " (" $5 " используется)"}')"

echo "✅ Все компоненты готовы для продвинутого режима"
echo "🤖 Запуск продвинутого RPA Bot..."
echo "🔧 Возможности: Антидетект, Стелс-режим, Решение капчи, Человеческое поведение"

# Запуск приложения с расширенным логированием
python rpa_bot_cloud.py 2>&1 | tee logs/bot_output.log
