
# Browser Automation Service (Enhanced)

Продвинутый сервис автоматизации браузера для управления социальными сетями с anti-ban мерами и масштабированием.

## Новые возможности

### 🛡️ Anti-Detection & Поведенческий слой
- ✅ Кастомизация fingerprint (WebGL, Canvas, Audio, Screen)
- ✅ Человекоподобные взаимодействия (ошибки ввода, естественные движения мыши)
- ✅ Динамическая смена User-Agent, timezone, locale
- ✅ Обход детекции автоматизации
- ✅ Имитация чтения и случайных взаимодействий

### 🔄 Proxy & Session Management
- ✅ Автоматическое тестирование и ротация прокси
- ✅ Статистика качества прокси (скорость, надёжность)
- ✅ Persistent browser contexts для каждого аккаунта
- ✅ Сохранение состояния сессий

### 📈 Масштабирование и изоляция
- ✅ Система воркеров с распределением нагрузки
- ✅ Heartbeat и мониторинг состояния воркеров
- ✅ Захват и освобождение заданий
- ✅ Контроль ресурсов (память, CPU)

### 🎯 Гибкие сценарии
- ✅ Менеджер кастомных сценариев
- ✅ JSON-конфигурация поведения
- ✅ Шаблоны для разных платформ
- ✅ Пошаговое выполнение с логированием

### 🔧 Улучшенная обработка ошибок
- ✅ Классификация типов ошибок
- ✅ Стратегии восстановления
- ✅ Автоматические повторные попытки
- ✅ Exponential backoff
- ✅ Смена прокси при ошибках

## Установка

1. Установите зависимости:
```bash
npm install
```

2. Установите браузеры для Playwright:
```bash
npx playwright install chromium
```

3. Настройте переменные окружения:
```bash
cp .env.example .env
# Отредактируйте .env файл
```

## Запуск

### Разработка
```bash
npm run dev
```

### Продакшен
```bash
npm start
```

### Тестирование прокси
```bash
npm run test-proxies
```

## Конфигурация

### Основные настройки (.env)
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
MAX_CONCURRENT_JOBS=3
CHECK_INTERVAL=30000
WORKER_ID=worker-1
MAX_MEMORY_MB=2048
```

### Anti-Captcha (опционально)
```env
CAPTCHA_ENABLED=true
CAPTCHA_SERVICE=anticaptcha
CAPTCHA_API_KEY=your_api_key
```

## Архитектура

### Основные компоненты
- `src/index.js` - главный файл с Worker Manager
- `src/anti-detect.js` - система анти-детекта
- `src/human-behavior.js` - имитация человеческого поведения
- `src/proxy-manager.js` - управление прокси
- `src/error-handler.js` - обработка ошибок и восстановление
- `src/scenario-manager.js` - управление кастомными сценариями
- `src/worker-manager.js` - система воркеров

### Компоненты базы данных (нужно создать)
```sql
-- Таблица воркеров
CREATE TABLE workers (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'offline',
  max_jobs INTEGER NOT NULL DEFAULT 3,
  current_jobs INTEGER NOT NULL DEFAULT 0,
  last_heartbeat TIMESTAMP WITH TIME ZONE,
  system_info JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Таблица шаблонов сценариев
CREATE TABLE scenario_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  platform TEXT NOT NULL,
  description TEXT,
  steps JSONB NOT NULL,
  settings JSONB,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Добавляем поле assigned_worker в scenarios
ALTER TABLE scenarios ADD COLUMN assigned_worker TEXT;
```

## Использование

### 1. Запуск одного воркера
```bash
WORKER_ID=worker-1 npm start
```

### 2. Запуск фермы воркеров
```bash
# Воркер 1
WORKER_ID=worker-1 MAX_CONCURRENT_JOBS=3 npm start &

# Воркер 2
WORKER_ID=worker-2 MAX_CONCURRENT_JOBS=5 npm start &

# Воркер 3
WORKER_ID=worker-3 MAX_CONCURRENT_JOBS=2 npm start &
```

### 3. Мониторинг воркеров
Воркеры отправляют heartbeat каждые 30 секунд в таблицу `workers`.

## Примеры кастомных сценариев

### Telegram прогрев
```json
{
  "name": "Telegram Warmup Advanced",
  "platform": "telegram",
  "steps": [
    {
      "type": "navigate",
      "url": "https://web.telegram.org/"
    },
    {
      "type": "wait",
      "minTime": 3000,
      "maxTime": 8000
    },
    {
      "type": "scroll",
      "count": 3
    },
    {
      "type": "random_interaction"
    }
  ]
}
```

## Мониторинг и отладка

### Логи
- Все действия логируются в таблицу `logs`
- Ошибки классифицируются по типам
- Статистика прокси обновляется в реальном времени

### Метрики воркеров
- Использование памяти и CPU
- Количество активных заданий
- Время последнего heartbeat
- Статус воркера

## Рекомендации для продакшена

1. **Мониторинг**: Настройте мониторинг воркеров через таблицу `workers`
2. **Прокси**: Используйте качественные приватные прокси
3. **Ресурсы**: Выделите достаточно RAM (рекомендуется 4GB+ на воркер)
4. **Сеть**: Стабильное интернет-соединение
5. **Капча**: Настройте сервис решения капчи для автоматизации

## Безопасность

- Fingerprint уникален для каждого аккаунта
- Сессии сохраняются между запусками
- Прокси тестируются на работоспособность
- Ошибки обрабатываются с умными повторными попытками
