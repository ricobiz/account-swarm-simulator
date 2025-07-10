# Минимальный Dockerfile для Railway
FROM python:3.11-slim

WORKDIR /app

# Системные зависимости и Chrome
RUN apt-get update && \
    apt-get install -y wget gnupg unzip curl ca-certificates && \
    wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | \
    gpg --dearmor -o /usr/share/keyrings/googlechrome-linux-keyring.gpg && \
    echo "deb [arch=amd64 signed-by=/usr/share/keyrings/googlechrome-linux-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" \
    > /etc/apt/sources.list.d/google.list && \
    apt-get update && \
    apt-get install -y google-chrome-stable && \
    rm -rf /var/lib/apt/lists/*

# Копируем requirements
COPY requirements.txt .
RUN pip install -r requirements.txt

# Копируем приложение
COPY app.py .

# Создаем директории
RUN mkdir -p logs screenshots

ENV PYTHONUNBUFFERED=1
EXPOSE 8080

CMD ["gunicorn", "-b", "0.0.0.0:8080", "app:app"]

