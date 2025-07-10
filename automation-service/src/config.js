
const { config } = require('dotenv');

config();

const CONFIG = {
  supabase: {
    url: process.env.SUPABASE_URL || 'https://izmgzstdgoswlozinmyk.supabase.co',
    serviceKey: process.env.SUPABASE_SERVICE_KEY
  },
  automation: {
    maxConcurrentJobs: parseInt(process.env.MAX_CONCURRENT_JOBS) || 3,
    checkInterval: parseInt(process.env.CHECK_INTERVAL) || 30000,
    retryAttempts: parseInt(process.env.RETRY_ATTEMPTS) || 3,
    proxyTestInterval: parseInt(process.env.PROXY_TEST_INTERVAL) || 300000, // 5 минут
    userAgents: [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
    ],
    scenarios: {
      telegram: {
        warmup: { minTime: 30000, maxTime: 120000, actions: ['scroll', 'click_chats', 'read_messages'] },
        posting: { minTime: 60000, maxTime: 180000, actions: ['post_message', 'react', 'comment'] }
      },
      tiktok: {
        upload: { minTime: 120000, maxTime: 300000, actions: ['upload_video', 'add_description', 'set_hashtags'] },
        interaction: { minTime: 45000, maxTime: 90000, actions: ['like', 'comment', 'follow', 'watch'] }
      },
      youtube: {
        comment: { minTime: 60000, maxTime: 180000, actions: ['watch_video', 'write_comment', 'like'] },
        upload: { minTime: 300000, maxTime: 600000, actions: ['upload_video', 'set_metadata', 'thumbnail'] }
      }
    }
  },
  captcha: {
    enabled: process.env.CAPTCHA_ENABLED === 'true',
    service: process.env.CAPTCHA_SERVICE || 'anticaptcha', // anticaptcha, 2captcha
    apiKey: process.env.CAPTCHA_API_KEY
  },
  scaling: {
    workerId: process.env.WORKER_ID || 'worker-1',
    maxMemoryUsage: parseInt(process.env.MAX_MEMORY_MB) || 2048,
    maxCpuUsage: parseInt(process.env.MAX_CPU_PERCENT) || 80
  }
};

module.exports = { CONFIG };
