# 🤖 RPA BOT с Multilogin - Полная документация системы

## 📋 ОБЗОР ПРОЕКТА

**Что это:** Облачная RPA (Robotic Process Automation) система для автоматизации действий в браузере с поддержкой антидетект браузеров через Multilogin API.

**Цель:** Автоматизация лайков, взаимодействий и других действий в социальных сетях (Telegram, YouTube, Instagram) с использованием человекоподобного поведения и уникальных браузерных отпечатков.

## 🏗️ АРХИТЕКТУРА СИСТЕМЫ

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   FRONTEND      │    │   SUPABASE       │    │   RAILWAY       │
│   (Lovable)     │◄──►│   (Backend)      │◄──►│   (RPA Bot)     │
│                 │    │                  │    │                 │
│ - React/TS      │    │ - Database       │    │ - Python Flask  │
│ - Tailwind CSS  │    │ - Edge Functions │    │ - Selenium      │
│ - shadcn/ui     │    │ - Auth           │    │ - Chrome        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   MULTILOGIN     │
                       │   (API)          │
                       │                  │
                       │ - Browser        │
                       │ - Profiles       │
                       │ - Fingerprints   │
                       └──────────────────┘
```

## 🔧 ТЕХНИЧЕСКИЕ ДЕТАЛИ

### Frontend (Lovable)
- **Технологии:** React, TypeScript, Tailwind CSS, shadcn/ui
- **Страницы:**
  - `/test` - тестирование системы
  - `/visual-rpa` - визуальный конструктор RPA
  - `/rpa` - основная RPA панель
  - `/accounts` - управление аккаунтами
  - `/auth` - авторизация

### Backend (Supabase)
- **База данных:**
  - `multilogin_tokens` - токены Multilogin API
  - `rpa_tasks` - задачи для выполнения
  - `accounts` - аккаунты пользователей
  - `scenarios` - сценарии автоматизации
  - `profiles` - профили пользователей
  - `proxies` - прокси серверы

- **Edge Functions:**
  - `test-rpa-direct` - прямое тестирование RPA бота
  - `multilogin-token-manager` - управление токенами
  - `rpa-task` - выполнение RPA задач

### RPA Bot (Railway)
- **Технологии:** Python, Flask, Selenium, undetected-chromedriver
- **Файлы:**
  - `rpa_bot_cloud.py` - основной сервер
  - `enhanced_rpa_bot.py` - расширенная версия (не используется)
  - `multilogin_integration.py` - интеграция с Multilogin
  - `Dockerfile` - контейнеризация

## 🔄 ПОТОК ВЫПОЛНЕНИЯ ЗАДАЧ

### 1. Получение токена Multilogin
```
Frontend → Edge Function → Supabase DB → multilogin_tokens table
```

### 2. Создание RPA задачи
```
Frontend → Edge Function → Railway Bot → Multilogin API → Browser
```

### 3. Выполнение действий
```
1. Navigate to URL
2. Wait for loading
3. Perform actions (click, type, scroll)
4. Take screenshot
5. Return results
```

## ✅ ЧТО РЕАЛИЗОВАНО

### 🎯 Основная функциональность
- ✅ **Получение токенов Multilogin** через API
- ✅ **Сохранение токенов** в Supabase
- ✅ **Передача токенов** в Railway бот
- ✅ **Создание Multilogin профилей**
- ✅ **Выполнение RPA действий:** navigate, click, type, wait, scroll, screenshot
- ✅ **Человекоподобное поведение** (случайные задержки, естественное движение мыши)
- ✅ **Антидетект настройки** браузера

### 🔧 Техническая реализация
- ✅ **Docker контейнеризация** Railway бота
- ✅ **GitHub интеграция** с автодеплоем
- ✅ **Edge Functions** для API логики
- ✅ **RLS политики** для безопасности данных
- ✅ **Логирование и мониторинг**

### 🎨 Интерфейс
- ✅ **Тестирование системы** (`/test` страница)
- ✅ **Мониторинг задач** (RPA Task Monitor)
- ✅ **Статус токенов** (Multilogin Token Status)
- ✅ **Прямая проверка** RPA бота
- ✅ **Отображение скриншотов**

### 🎯 ТЕКУЩИЙ ФОКУС (НА ЧЕМ СОСРЕДОТОЧЕНЫ СЕЙЧАС)

**ПРОБЛЕМА:** Скриншоты создаются Railway ботом, но не отображаются в интерфейсе

**ЧТО УЖЕ ИСПРАВИЛИ СЕГОДНЯ:**
1. ✅ Edge Function теперь получает токены из базы данных (НЕ из env переменных)
2. ✅ Railway бот получает токены из Edge Function правильно
3. ✅ URL тестирования изменен с httpbin.org на Google
4. ✅ Добавлен эндпоинт `/multilogin/st` (исправлена 404 ошибка)
5. ✅ TestRPAButton добавлен на страницу `/test`
6. ✅ Улучшено логирование на всех уровнях

**ТЕКУЩЕЕ СОСТОЯНИЕ ЛОГОВ:**
- ✅ `🔑 Получен токен Multilogin в задаче: eyJ...` (токен передается)
- ✅ `Action 3/3: screenshot` (скриншот создается)
- ✅ `📸 Скриншот создан и сконвертирован в base64: X символов` (конвертация работает)
- ❌ Скриншот не доходит до frontend или не отображается

**СЛЕДУЮЩИЙ ШАГ:** Найти где теряется скриншот в цепочке Railway → Edge Function → Frontend

## 🐛 ПРОБЛЕМЫ КОТОРЫЕ РЕШАЛИ

### 1. Проблема с GitHub синхронизацией
- **Проблема:** Railway не обновлялся при изменениях кода
- **Решение:** Исправили GitHub интеграцию, добавили принудительные коммиты

### 2. Проблема с токенами Multilogin
- **Проблема:** Railway бот не получал актуальные токены
- **Решение:** Изменили Edge Function для получения токенов из DB вместо env переменных

### 3. Проблема с URL тестирования
- **Проблема:** Тесты выполнялись на httpbin.org вместо Google
- **Решение:** Исправили Edge Function для перехода на Google

### 4. Проблема с отображением кнопки тестирования
- **Проблема:** "Прямая проверка RPA бота" была только в `/visual-rpa`
- **Решение:** Добавили TestRPAButton в страницу `/test`

### 5. Проблема с эндпоинтом Multilogin
- **Проблема:** 404 ошибка на `/multilogin/st`
- **Решение:** Добавили недостающий эндпоинт в Railway бот

## 🎯 СЛЕДУЮЩИЕ ШАГИ (ЧТО НУЖНО ДОДЕЛАТЬ)

### Приоритет 1: Исправить отображение скриншотов
1. **Проверить передачу скриншота** из Railway → Edge Function → Frontend
2. **Добавить детальное логирование** размера данных на каждом этапе
3. **Проверить base64 кодирование** скриншота
4. **Убедиться что скриншот не обрезается** при передаче

### Приоритет 2: Тестирование Multilogin интеграции
1. **Проверить создание профилей** Multilogin
2. **Тестировать антидетект настройки**
3. **Проверить работу с реальными сайтами**

### Приоритет 3: Улучшение функциональности
1. **Добавить больше RPA действий** (dropdown, checkbox, etc.)
2. **Улучшить обработку ошибок**
3. **Добавить настройки прокси**
4. **Реализовать планировщик задач**

## 📁 ДЕТАЛЬНАЯ КАРТА ФАЙЛОВ И СВЯЗЕЙ

### 🐳 DOCKER ФАЙЛЫ (КРИТИЧЕСКИ ВАЖНО!)

**У НАС ЕСТЬ 3 DOCKER ФАЙЛА:**

1. **`./Dockerfile` (КОРНЕВОЙ) - ИСПОЛЬЗУЕТСЯ RAILWAY**
   ```dockerfile
   FROM python:3.11-slim
   # Копирует из rpa-bot-cloud/
   COPY rpa-bot-cloud/requirements.txt .
   COPY rpa-bot-cloud/ .
   CMD ["python", "rpa_bot_cloud.py"]  # ← ЗАПУСКАЕТ ЭТОТ ФАЙЛ
   ```
   - ⚠️ **RAILWAY ИСПОЛЬЗУЕТ ЭТОТ ФАЙЛ**
   - Находится в корне проекта
   - Копирует содержимое из `rpa-bot-cloud/`
   - Запускает `rpa_bot_cloud.py` (НЕ enhanced_rpa_bot.py!)

2. **`./Dockerfile.root` - НЕ ИСПОЛЬЗУЕТСЯ**
   ```dockerfile
   # Альтернативная версия с gunicorn
   # Railway НЕ использует этот файл
   ```

3. **`./rpa-bot-cloud/Dockerfile` - НЕ ИСПОЛЬЗУЕТСЯ RAILWAY**
   ```dockerfile
   # Локальный Docker файл для разработки
   # Railway его НЕ видит
   ```

**🚨 ВАЖНО:** Railway смотрит только на корневой `./Dockerfile`!

### 🤖 RPA BOT ФАЙЛЫ (ГДЕ ЧТО НАХОДИТСЯ)

**АКТИВНЫЕ ФАЙЛЫ (ИСПОЛЬЗУЮТСЯ):**
- `rpa-bot-cloud/rpa_bot_cloud.py` ← **ОСНОВНОЙ ФАЙЛ** (Railway запускает этот)
- `rpa-bot-cloud/multilogin_integration.py` ← Интеграция с Multilogin
- `rpa-bot-cloud/requirements.txt` ← Python зависимости

**НЕАКТИВНЫЕ ФАЙЛЫ (НЕ ИСПОЛЬЗУЮТСЯ):**
- `rpa-bot-cloud/enhanced_rpa_bot.py` ← НЕ используется Railway
- `rpa-bot/` (вся папка) ← Старая версия, НЕ используется

**КОНФИГУРАЦИЯ RAILWAY:**
- `railway.json` ← Настройки Railway (builder: DOCKERFILE, startCommand: python rpa_bot_cloud.py)

### 🔗 ВСЕ ССЫЛКИ СИСТЕМЫ

#### 🌐 Production URLs
- **Railway RPA Bot:** https://account-swarm-simulator-production.up.railway.app/
  - Health check: `/health`
  - RPA execution: `/execute`
  - Multilogin status: `/multilogin/status`
  - Simple status: `/multilogin/st`

#### 📊 Dashboards
- **Railway Dashboard:** https://railway.app/dashboard
  - Проект: `account-swarm-simulator`
  - Environment: `production`
  - Логи: Railway Dashboard → Deployments → Logs

- **Supabase Dashboard:** https://supabase.com/dashboard/project/izmgzstdgoswlozinmyk
  - Project ID: `izmgzstdgoswlozinmyk`
  - Database: https://supabase.com/dashboard/project/izmgzstdgoswlozinmyk/editor
  - Edge Functions: https://supabase.com/dashboard/project/izmgzstdgoswlozinmyk/functions
  - Logs: https://supabase.com/dashboard/project/izmgzstdgoswlozinmyk/logs

#### 🔑 GitHub Repository
- **Repo:** https://github.com/ricobtz/account-swarm-simulator
- **Owner:** ricobtz
- **Branch:** main (автодеплой в Railway)

#### 🛠️ API Endpoints

**Supabase Edge Functions:**
```
https://izmgzstdgoswlozinmyk.supabase.co/functions/v1/
├── test-rpa-direct              # Прямое тестирование RPA
├── multilogin-token-manager     # Управление токенами
├── rpa-task                     # Выполнение RPA задач
├── multilogin-api               # Multilogin API
└── rpa-health                   # Проверка здоровья RPA
```

**Railway RPA Bot:**
```
https://account-swarm-simulator-production.up.railway.app/
├── /health                      # Проверка здоровья
├── /execute                     # Выполнение RPA задач
├── /multilogin/status          # Статус Multilogin
├── /multilogin/st              # Простой статус
└── /test                       # Тестовый эндпоинт
```

### 🗃️ БАЗА ДАННЫХ SUPABASE

**Project Details:**
- Project ID: `izmgzstdgoswlozinmyk`
- URL: `https://izmgzstdgoswlozinmyk.supabase.co`
- Anon Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6bWd6c3RkZ29zd2xvemlubXlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxNTk3NzksImV4cCI6MjA2NTczNTc3OX0.5BEISZmOjbbnBCPlqVyvuHiEDf9NOhaHh33U07UNzVU`

**Таблицы:**
```sql
multilogin_tokens (
  id UUID PRIMARY KEY,
  token TEXT NOT NULL,
  email TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
)

rpa_tasks (
  id UUID PRIMARY KEY,
  task_id TEXT NOT NULL,
  task_data JSONB NOT NULL,
  result_data JSONB,
  status TEXT DEFAULT 'pending',
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
)

accounts (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  platform TEXT NOT NULL,
  status TEXT DEFAULT 'idle',
  proxy_id UUID,
  last_action TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
)

profiles (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  role app_role DEFAULT 'basic',
  subscription_status subscription_status DEFAULT 'trial',
  subscription_end TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  accounts_limit INTEGER DEFAULT 5,
  scenarios_limit INTEGER DEFAULT 2,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
)

scenarios (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  platform TEXT NOT NULL,
  config JSONB,
  status TEXT DEFAULT 'stopped',
  accounts_count INTEGER DEFAULT 0,
  progress INTEGER DEFAULT 0,
  next_run TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
)

proxies (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  ip TEXT NOT NULL,
  port INTEGER NOT NULL,
  username TEXT,
  password TEXT,
  country TEXT,
  status TEXT DEFAULT 'offline',
  speed TEXT,
  usage INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
)

logs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  account_id UUID,
  scenario_id UUID,
  action TEXT NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'info',
  created_at TIMESTAMPTZ DEFAULT now()
)
```

### 🔐 ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ И СЕКРЕТЫ

#### Supabase Secrets
```
SUPABASE_URL=https://izmgzstdgoswlozinmyk.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=[service role key]
SUPABASE_DB_URL=[database url]
API_KEY=[some api key]
client_key=[client key]
Api=[api value]
RPA_BOT_ENDPOINT=https://account-swarm-simulator-production.up.railway.app/
MULTILOGIN_TOKEN=[получается автоматически]
MULTILOGIN_EMAIL=[multilogin email]
MULTILOGIN_PASSWORD=[multilogin password]
```

#### Railway Environment Variables
- Railway автоматически получает переменные из репозитория
- Использует `Dockerfile` из корня для сборки
- PORT автоматически назначается Railway (обычно 8080)

### 📂 ПОЛНАЯ СТРУКТУРА ПРОЕКТА

```
account-swarm-simulator/
├── 🐳 Dockerfile                           # ← RAILWAY ИСПОЛЬЗУЕТ ЭТОТ
├── 🐳 Dockerfile.root                      # ← НЕ используется
├── ⚙️ railway.json                        # ← Railway конфигурация
├── 🔧 force-update-railway.sh             # ← Скрипт принудительного обновления
├── 📚 README-FULL-SYSTEM.md               # ← ЭТА ИНСТРУКЦИЯ
│
├── 🎨 src/                                # Frontend (Lovable)
│   ├── pages/
│   │   ├── TestFunctionality.tsx          # /test страница
│   │   ├── Index.tsx                      # / главная
│   │   ├── RPA.tsx                        # /rpa
│   │   ├── VisualRPA.tsx                  # /visual-rpa
│   │   ├── Accounts.tsx                   # /accounts
│   │   └── Auth.tsx                       # /auth
│   ├── components/
│   │   ├── TestRPAButton.tsx              # Кнопка "Прямая проверка RPA бота"
│   │   ├── MultiloginTokenStatus.tsx      # Статус токенов
│   │   ├── MultiloginTestButton.tsx       # Тест Multilogin
│   │   └── rpa/MultiloginStatus.tsx       # Статус RPA бота
│   └── hooks/
│       ├── useMultilogin.ts               # Хук Multilogin API
│       ├── useRPAService.ts               # Хук RPA сервиса
│       └── useAuth.tsx                    # Хук авторизации
│
├── 🗄️ supabase/                          # Backend (Supabase)
│   ├── functions/
│   │   ├── test-rpa-direct/index.ts       # ← ОСНОВНАЯ ФУНКЦИЯ ТЕСТИРОВАНИЯ
│   │   ├── multilogin-token-manager/      # Управление токенами
│   │   ├── rpa-task/index.ts              # Выполнение RPA задач
│   │   └── multilogin-api/index.ts        # Multilogin API
│   ├── migrations/                        # SQL миграции
│   └── config.toml                       # Supabase конфигурация
│
├── 🤖 rpa-bot-cloud/                     # ← RAILWAY ИСПОЛЬЗУЕТ ЭТУ ПАПКУ
│   ├── 📄 rpa_bot_cloud.py               # ← ОСНОВНОЙ ФАЙЛ (Railway запускает)
│   ├── 🔌 multilogin_integration.py       # Интеграция Multilogin
│   ├── 📋 requirements.txt                # Python зависимости
│   ├── 🐳 Dockerfile                      # ← НЕ используется Railway
│   ├── 🔧 enhanced_rpa_bot.py             # ← НЕ используется
│   ├── 📊 DEPLOYMENT_TRIGGER.md           # Триггер деплоя
│   └── 🧪 rpa_bot_multilogin.py          # ← НЕ используется
│
└── 📁 rpa-bot/                           # ← СТАРАЯ ВЕРСИЯ, НЕ ИСПОЛЬЗУЕТСЯ
    ├── cloud_rpa_bot.py                  # Старый файл
    ├── enhanced_human_rpa_bot.py         # Старый файл
    └── ...                               # Другие старые файлы
```

### 🔄 ПОТОК ДЕПЛОЯ

```
1. Lovable (изменения кода)
    ↓
2. GitHub (ricobtz/account-swarm-simulator)
    ↓ (автоматический webhook)
3. Railway (получает изменения)
    ↓
4. Railway строит Docker из ./Dockerfile
    ↓ (копирует rpa-bot-cloud/)
5. Railway запускает python rpa_bot_cloud.py
    ↓
6. RPA Bot доступен на https://account-swarm-simulator-production.up.railway.app/
```

### 🧪 ТЕСТИРОВАНИЕ (ПОШАГОВАЯ ИНСТРУКЦИЯ)

#### 1. Быстрая проверка системы:
```bash
# 1. Проверить Railway бот
curl https://account-swarm-simulator-production.up.railway.app/health

# 2. Проверить Multilogin статус
curl https://account-swarm-simulator-production.up.railway.app/multilogin/status

# 3. Тест простого RPA
curl -X POST https://account-swarm-simulator-production.up.railway.app/execute \
  -H "Content-Type: application/json" \
  -d '{"task_id":"manual_test","url":"https://google.com","actions":[{"type":"screenshot"}]}'
```

#### 2. Полное тестирование через UI:
1. Открыть https://lovable.dev (ваш проект)
2. Перейти на `/test`
3. Нажать **"Прямая проверка RPA бота"**
4. Открыть F12 → Console для просмотра логов
5. Проверить что скриншот появляется

#### 3. Мониторинг логов:
- **Railway:** https://railway.app/dashboard → account-swarm-simulator → Deployments
- **Supabase:** https://supabase.com/dashboard/project/izmgzstdgoswlozinmyk/functions → test-rpa-direct → Logs
- **Browser:** F12 → Console

### 🚨 ЧАСТЫЕ ПРОБЛЕМЫ И РЕШЕНИЯ

#### Проблема: Railway не обновляется
**Причина:** GitHub не синхронизируется или Railway не видит изменения
**Решение:**
```bash
# Запустить принудительное обновление
./force-update-railway.sh

# Или изменить любой файл чтобы создать коммит
echo "# Force update $(date)" >> FORCE_RAILWAY_UPDATE.txt
```

#### Проблема: RPA бот возвращает ошибки
**Причина:** Multilogin токен отсутствует или истек
**Решение:**
1. Проверить токены в Supabase: `/test` → "Проверить токен"
2. Обновить токен если нужно
3. Перезапустить тест

#### Проблема: Скриншоты не отображаются
**Причина:** Проблема с передачей base64 данных
**Решение:**
1. Проверить логи Railway бота
2. Проверить логи Edge Function
3. Убедиться что данные не обрезаются при передаче

---

## 🔧 НАСТРОЙКИ ОКРУЖЕНИЯ

### Supabase Secrets
- `MULTILOGIN_TOKEN` - токен Multilogin API
- `MULTILOGIN_EMAIL` - email для Multilogin
- `MULTILOGIN_PASSWORD` - пароль для Multilogin
- `RPA_BOT_ENDPOINT` - URL Railway бота

### Railway Environment
- Railway автоматически получает переменные из GitHub
- Использует корневой `Dockerfile` для сборки
- Endpoint: `https://account-swarm-simulator-production.up.railway.app/`

## 🚀 КАК ТЕСТИРОВАТЬ

### Быстрый тест:
1. Перейти на `/test`
2. Нажать **"Прямая проверка RPA бота"**
3. Проверить логи в консоли (F12)
4. Убедиться что скриншот отображается

### Полный тест:
1. Проверить статус токенов Multilogin
2. Запустить RPA тест с токеном
3. Проверить создание профилей Multilogin
4. Тестировать различные RPA действия

## 📞 ПОДДЕРЖКА И ОТЛАДКА

### Логи можно найти:
- **Frontend:** Browser Console (F12)
- **Edge Functions:** Supabase Dashboard → Functions → Logs
- **Railway Bot:** Railway Dashboard → Deployments → Logs

### Команды для отладки:
```bash
# Принудительное обновление Railway
./force-update-railway.sh

# Проверка статуса Railway
curl https://account-swarm-simulator-production.up.railway.app/health

# Прямой тест RPA
curl -X POST https://account-swarm-simulator-production.up.railway.app/execute \
  -H "Content-Type: application/json" \
  -d '{"task_id":"test","url":"https://google.com","actions":[{"type":"screenshot"}]}'
```

---

**Последнее обновление:** 2025-07-12 23:20  
**Статус:** В разработке - отладка скриншотов  
**Версия:** Enhanced-Multilogin-v2.3-TOKEN-FIX