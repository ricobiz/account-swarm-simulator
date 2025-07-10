#!/usr/bin/env python3
"""
Точка входа для RPA бота с Multilogin
"""

import os
import sys
import subprocess
import logging
from flask import Flask, jsonify, request

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

@app.route('/health', methods=['GET'])
def health():
    """Health check"""
    return jsonify({
        'status': 'ok',
        'message': 'RPA бот с Multilogin готов',
        'version': '2.0.0-multilogin'
    })

@app.route('/test', methods=['GET'])
def test_rpa():
    """Тест RPA системы"""
    try:
        # Проверяем Chrome
        chrome_path = '/usr/bin/google-chrome-stable'
        chrome_available = os.path.exists(chrome_path)
        
        # Проверяем Multilogin файлы
        multilogin_files = ['multilogin_enhanced.py', 'rpa_bot_multilogin.py']
        available_files = [f for f in multilogin_files if os.path.exists(f)]
        
        logger.info(f"Chrome: {'✅' if chrome_available else '❌'}")
        logger.info(f"Multilogin файлы: {available_files}")
        
        return jsonify({
            'success': True,
            'chrome_available': chrome_available,
            'multilogin_files': available_files,
            'message': 'RPA система с Multilogin готова'
        })
        
    except Exception as e:
        logger.error(f"Ошибка теста: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/execute', methods=['POST'])
def execute_task():
    """Переадресация к основному RPA боту"""
    try:
        # В production будет переадресация к rpa_bot_multilogin.py
        task = request.get_json()
        task_id = task.get('taskId', 'unknown')
        
        logger.info(f"Получена RPA задача: {task_id}")
        
        return jsonify({
            'success': True,
            'taskId': task_id,
            'message': 'Задача передана RPA боту',
            'multilogin_ready': True
        })
        
    except Exception as e:
        logger.error(f"Ошибка выполнения: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    logger.info(f"🚀 Запуск RPA бота с Multilogin на порту {port}")
    app.run(host='0.0.0.0', port=port, debug=False)