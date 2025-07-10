FROM python:3.11-slim

# Обновление пакетов и установка Chrome
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    unzip \
    curl \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

# Установка Google Chrome
RUN wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Копируем requirements и устанавливаем зависимости
COPY rpa-bot-cloud/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копируем код RPA бота
COPY rpa-bot-cloud/ .

# Создаем директории
RUN mkdir -p logs screenshots

# Переменные окружения
ENV DISPLAY=:99
ENV PYTHONUNBUFFERED=1

EXPOSE 8080

# Запуск
CMD ["python", "rpa_bot_cloud.py"]