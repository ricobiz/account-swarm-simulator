# Railway Dockerfile для Account Swarm Simulator
FROM python:3.11-slim

ENV DEBIAN_FRONTEND=noninteractive
WORKDIR /app

# Системные зависимости для Chrome и Selenium
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        wget gnupg unzip curl ca-certificates \
        fonts-liberation libappindicator3-1 libasound2 \
        libatk-bridge2.0-0 libdrm2 libxcomposite1 libxdamage1 \
        libxrandr2 libgbm1 libxss1 libgconf-2-4 build-essential \
        tesseract-ocr libtesseract-dev && \
    rm -rf /var/lib/apt/lists/*

# Google Chrome Stable
RUN wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | \
       gpg --dearmor -o /usr/share/keyrings/googlechrome-linux-keyring.gpg && \
    echo "deb [arch=amd64 signed-by=/usr/share/keyrings/googlechrome-linux-keyring.gpg] \
         http://dl.google.com/linux/chrome/deb/ stable main" \
         > /etc/apt/sources.list.d/google.list && \
    apt-get update && apt-get install -y google-chrome-stable && \
    rm -rf /var/lib/apt/lists/*

# Копируем файлы requirements сначала для кэширования слоев
COPY ./rpa-bot-cloud/requirements_multilogin.txt /app/requirements_multilogin.txt

# Устанавливаем зависимости
RUN pip install --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements_multilogin.txt

# Создаем необходимые директории
RUN mkdir -p /app/logs /app/screenshots && \
    chmod -R 755 /app

# Копируем файлы приложения по одному для большей надежности
COPY ./rpa-bot-cloud/multilogin_enhanced.py /app/
COPY ./rpa-bot-cloud/rpa_bot_multilogin.py /app/
COPY ./rpa-bot-cloud/config.py /app/
COPY ./rpa-bot-cloud/multilogin_integration.py /app/
COPY ./rpa-bot-cloud/.env.railway /app/.env

# Переменные окружения
ENV PYTHONUNBUFFERED=1
ENV CHROME_BIN=/usr/bin/google-chrome
ENV PYTHONPATH=/app

EXPOSE 8080

# Запуск RPA бота с Multilogin
CMD ["gunicorn", "-b", "0.0.0.0:8080", "rpa_bot_multilogin:app"]

