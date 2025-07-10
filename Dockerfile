# Простейший Dockerfile без Chrome для теста
FROM python:3.11-slim

WORKDIR /app

# Только базовые зависимости
RUN apt-get update && \
    apt-get install -y curl && \
    rm -rf /var/lib/apt/lists/*

# Копируем зависимости
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копируем приложение
COPY app.py .

# Создаем директории
RUN mkdir -p logs screenshots

ENV PYTHONUNBUFFERED=1
EXPOSE 8080

CMD ["gunicorn", "-b", "0.0.0.0:8080", "app:app"]

