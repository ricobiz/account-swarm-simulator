#!/bin/bash
# Скрипт для принудительного обновления Railway deployment

echo "🚀 Принудительное обновление Railway RPA Bot..."

# Проверяем статус git
echo "📋 Текущий статус git:"
git status

echo ""
echo "🔄 Добавляем все изменения..."
git add .

echo ""
echo "📝 Создаем коммит с timestamp..."
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
git commit -m "Force update RPA bot - Enhanced with Multilogin integration - $TIMESTAMP"

echo ""
echo "🚀 Пушим в главную ветку..."
git push origin main

echo ""
echo "✅ Изменения отправлены в GitHub!"
echo "⏳ Railway должен автоматически обновиться в течение 1-2 минут..."
echo ""
echo "💡 Проверьте Railway dashboard:"
echo "   https://railway.app/dashboard"
echo ""
echo "🔍 Для проверки статуса используйте кнопку 'Прямая проверка RPA бота'"