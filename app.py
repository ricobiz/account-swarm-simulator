#!/usr/bin/env python3
"""
Минимальный RPA бот для Railway
"""

import os
import logging
from flask import Flask, jsonify, request

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

@app.route('/health', methods=['GET'])
def health_check():
    """Проверка здоровья"""
    return jsonify({
        'status': 'healthy',
        'version': '1.0.0-minimal'
    })

@app.route('/test', methods=['GET'])
def test_basic():
    """Базовый тест без браузера"""
    try:
        logger.info("Базовый тест сервера...")
        
        return jsonify({
            'success': True,
            'message': 'Сервер работает',
            'version': '1.0.0-basic'
        })
        
    except Exception as e:
        logger.error(f"Ошибка теста: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/execute', methods=['POST'])
def execute_task():
    """Выполнение задачи"""
    try:
        task = request.get_json()
        task_id = task.get('taskId', 'unknown')
        
        logger.info(f"Получена задача: {task_id}")
        
        return jsonify({
            'success': True,
            'taskId': task_id,
            'message': 'Задача принята'
        })
        
    except Exception as e:
        logger.error(f"Ошибка выполнения: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    logger.info(f"Запуск на порту {port}")
    app.run(host='0.0.0.0', port=port, debug=False)

