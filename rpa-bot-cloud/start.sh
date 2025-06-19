
#!/bin/bash
# Универсальный скрипт запуска для Railway

echo "🚀 Запуск универсального Cloud RPA Bot на Railway..."

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

# Создание необходимых директорий с правильными правами
echo "📁 Создание директорий с правами..."
mkdir -p /app/screenshots /app/logs /app/profiles /app/extensions /app/downloads
chmod -R 755 /app/screenshots /app/logs /app/profiles /app/extensions /app/downloads

# Создание пользователя для Chrome если не существует
if ! id -u chrome > /dev/null 2>&1; then
    echo "👤 Создание пользователя chrome..."
    useradd -m -s /bin/bash chrome || echo "Пользователь chrome уже существует"
fi

# Установка правильных прав на Chrome
echo "🔐 Настройка прав Chrome..."
chmod 4755 /usr/bin/google-chrome || echo "Chrome не найден"
chmod 755 /usr/bin/chromedriver || echo "ChromeDriver не найден"

# Запуск виртуального дисплея
echo "🖥️  Запуск виртуального дисплея..."
Xvfb :99 -screen 0 1920x1080x24 -ac +extension GLX +render -noreset &
export DISPLAY=:99

# Запуск window manager
echo "🪟 Запуск window manager..."
fluxbox &

# Ожидание готовности дисплея
sleep 5

# Проверка Chrome с правильными параметрами
echo "🌐 Проверка Google Chrome..."
if google-chrome --version --no-sandbox --disable-dev-shm-usage; then
    echo "✅ Chrome установлен успешно"
    CHROME_VERSION=$(google-chrome --version --no-sandbox)
    echo "   Версия: $CHROME_VERSION"
else
    echo "❌ Chrome не найден или не работает"
    exit 1
fi

# Проверка Python зависимостей
echo "🐍 Проверка Python зависимостей..."
python -c "
try:
    import selenium
    import undetected_chromedriver
    import fake_useragent
    import numpy
    import pandas
    import sklearn
    import flask
    import requests
    print('✅ Все зависимости установлены')
except ImportError as e:
    print(f'❌ Отсутствует зависимость: {e}')
    exit(1)
" || {
    echo "❌ Не все Python зависимости установлены"
    exit 1
}

# Настройка прав доступа
chmod +x /app/rpa_bot_cloud.py

# Проверка системных ресурсов
echo "💾 Проверка системных ресурсов..."
echo "   Память: $(free -h | grep '^Mem:' | awk '{print $3 "/" $2}')"
echo "   Диск: $(df -h / | tail -1 | awk '{print $3 "/" $2 " (" $5 " используется)"}')"
echo "   CPU: $(nproc) ядер"

# Список поддерживаемых платформ
echo "🌐 Поддерживаемые платформы:"
echo "   📱 Instagram - лайки, подписки, комментарии"
echo "   🎵 TikTok - лайки, подписки, комментарии"
echo "   🎥 YouTube - лайки, подписки, комментарии"
echo "   🐦 X (Twitter) - лайки, ретвиты, комментарии"
echo "   📘 Facebook - лайки, комментарии, репосты"
echo "   💼 LinkedIn - лайки, подключения, комментарии"
echo "   💬 Telegram - отправка сообщений"
echo "   📖 Reddit - голосование, комментарии"
echo "   💬 Discord - отправка сообщений"
echo "   📱 WhatsApp - отправка сообщений"

echo "✅ Все компоненты готовы для универсального режима"
echo "🤖 Запуск универсального RPA Bot..."
echo "🔧 Возможности:"
echo "   🛡️  Антидетект система"
echo "   👤 Имитация человеческого поведения"
echo "   🔧 Решение капчи"
echo "   🌐 Поддержка всех основных платформ"
echo "   📊 Извлечение и анализ данных"
echo "   🔄 Автоматическая ротация профилей"

# Запуск приложения с расширенным логированием и правильными правами
echo "🚀 Запуск RPA Bot на порту ${PORT:-5000}..."
exec python /app/rpa_bot_cloud.py 2>&1 | tee /app/logs/bot_output.log
