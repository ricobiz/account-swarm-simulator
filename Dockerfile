# Dockerfile для RPA бота с Multilogin
FROM python:3.11-slim

WORKDIR /app

# Установка системных зависимостей для Chrome
RUN apt-get update && \
    apt-get install -y \
        wget gnupg unzip curl ca-certificates \
        fonts-liberation libappindicator3-1 libasound2 \
        libatk-bridge2.0-0 libdrm2 libxcomposite1 libxdamage1 \
        libxrandr2 libgbm1 libxss1 libgconf-2-4 \
        libxcb1 libxfixes3 libxrender1 libxtst6 \
        libnss3 libnspr4 libatk1.0-0 libcairo-gobject2 \
        libgtk-3-0 libgdk-pixbuf2.0-0 && \
    wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | \
    gpg --dearmor -o /usr/share/keyrings/googlechrome-linux-keyring.gpg && \
    echo "deb [arch=amd64 signed-by=/usr/share/keyrings/googlechrome-linux-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" \
    > /etc/apt/sources.list.d/google.list && \
    apt-get update && \
    apt-get install -y google-chrome-stable && \
    rm -rf /var/lib/apt/lists/*

# Копируем requirements и устанавливаем зависимости
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копируем все файлы RPA бота
COPY rpa-bot-cloud/ .

# Создаем директории и устанавливаем права
RUN mkdir -p /tmp logs screenshots && \
    chmod 755 /tmp logs screenshots

ENV PYTHONUNBUFFERED=1
ENV CHROME_BIN=/usr/bin/google-chrome-stable
ENV CHROME_PATH=/usr/bin/google-chrome-stable
EXPOSE 8080

CMD ["python", "rpa_bot_multilogin.py"]

