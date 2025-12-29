const express = require("express");
const puppeteer = require("puppeteer");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/ping", (req, res) => res.send("ok"));

async function parseTasksWithLogin(username, password) {
  let browser;
  
  try {
    // встроенный Chromium
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--window-size=1920,1080"
      ],
     
    });

    const page = await browser.newPage();
    
    page.setDefaultNavigationTimeout(60000);
    page.setDefaultTimeout(60000);

    console.log("Переходим на сайт");
    await page.goto("https://kalys.bolotbekov.kg/tasks/", { 
      waitUntil: "networkidle2",
      timeout: 60000
    });

    console.log("Проверяем наличие формы логина...");
    
    try {
      await page.waitForSelector('input[name="username"]', { timeout: 5000 });
      
      console.log("Найдена форма логина. Вводим данные...");
      await page.type('input[name="username"]', username, { delay: 50 });
      await page.type('input[type="password"]', password, { delay: 50 });
      
      console.log("Отправляем форму...");
      await page.click('button[type="submit"]');
      
      await page.waitForNavigation({ 
        waitUntil: "networkidle2",
        timeout: 15000 
      }).catch(() => {
        console.log("Навигация не обнаружена, продолжаем...");
      });
      
      await page.waitForTimeout(2000);
      
    } catch (err) {
      console.log("Форма логина не найдена, продолжаем без входа...");
    }

    console.log("Загружаем страницу с заданиями...");
    await page.goto("https://kalys.bolotbekov.kg/tasks/", {
      waitUntil: "networkidle2",
      timeout: 30000
    });

    console.log("Ждем загрузку заданий...");
    await page.waitForSelector('.table-responsive', { 
      timeout: 10000 
    }).catch(() => {
      console.log("Таблица не найдена, пробуем другой селектор...");
    });

    console.log("Парсим задания...");
    const tasks = await page.evaluate(() => {
      const tasks = [];
      
      const tables = document.querySelectorAll('.table-responsive, table, .table');
      
      for (const table of tables) {
        const rows = table.querySelectorAll('tr');
        
        rows.forEach(row => {
          const link = row.querySelector('td a, th a');
          if (!link) return;
          
          const linkColor = window.getComputedStyle(link).color;
          const isSolved = linkColor === 'rgb(0, 255, 0)' || 
                          linkColor === 'green' ||
                          link.classList.contains('solved') ||
                          link.textContent.includes('✓') ||
                          link.style.color === 'green';
          
          tasks.push({
            title: link.textContent.trim(),
            url: link.href,
            solved: isSolved
          });
        });
        
        if (tasks.length > 0) break;
      }
      
      return tasks;
    });

    console.log(`Найдено ${tasks.length} заданий`);
    await browser.close();
    return tasks;

  } catch (error) {
    console.error("Ошибка в parseTasksWithLogin:", error.message);
    if (browser) {
      await browser.close().catch(() => {});
    }
    throw error;
  }
}

app.post("/api/tasks", async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: "Введите логин и пароль" });
  }

  try {
    console.log(`Запрос заданий для пользователя: ${username}`);
    const tasks = await parseTasksWithLogin(username, password);
    res.json({ tasks });
  } catch (error) {
    console.error("Ошибка при получении заданий:", error.message);
    
    let errorMessage = "Не удалось получить задания";
    
    if (error.message.includes("timeout")) {
      errorMessage = "Сайт слишком долго отвечает. Попробуйте позже.";
    } else if (error.message.includes("net::ERR")) {
      errorMessage = "Не удалось подключиться к сайту. Проверьте интернет-соединение.";
    } else if (error.message.includes("executablePath")) {
      errorMessage = "Ошибка запуска браузера. Пожалуйста, переустановите приложение.";
    }
    
    res.status(500).json({ 
      error: errorMessage 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});