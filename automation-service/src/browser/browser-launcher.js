
const { Builder } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

class BrowserLauncher {
  constructor(proxy = null) {
    this.proxy = proxy;
  }

  async launch() {
    const options = new chrome.Options();
    
    // Добавляем аргументы для Railway
    options.addArguments(
      '--headless=new',
      '--no-sandbox',
      '--disable-setuid-sandbox', 
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1920,1080',
      '--disable-blink-features=AutomationControlled'
    );

    if (this.proxy) {
      options.addArguments(`--proxy-server=http://${this.proxy.ip}:${this.proxy.port}`);
    }

    const driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();
      
    return driver;
  }

  createContextOptions(fingerprint, storageState) {
    return {
      userAgent: fingerprint.userAgent,
      viewport: fingerprint.viewport,
      locale: fingerprint.locale,
      timezoneId: fingerprint.timezone,
      permissions: ['notifications'],
      storageState
    };
  }

  async setupAdvancedAntiDetect(page) {
    // Скрываем webdriver
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      
      // Убираем chrome.runtime
      delete window.chrome?.runtime;
      
      // Модифицируем navigator.plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5].map(() => ({ name: 'Plugin' }))
      });
      
      // Модифицируем navigator.languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en']
      });
    });

    // Перехватываем и модифицируем заголовки
    await page.route('**/*', async (route) => {
      const headers = {
        ...route.request().headers(),
        'sec-ch-ua': '"Google Chrome";v="119", "Chromium";v="119", "Not?A_Brand";v="24"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'none',
        'upgrade-insecure-requests': '1'
      };
      
      await route.continue({ headers });
    });
  }
}

module.exports = { BrowserLauncher };
