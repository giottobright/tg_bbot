const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const serverless = require('serverless-http');

// Используем токен из переменных окружения
const token = process.env.BOT_TOKEN;
if (!token) {
  console.error('BOT_TOKEN не задан! Проверьте переменные окружения.');
}

const webAppUrl = 'https://lovedaily.netlify.app/';

// Создаем экземпляр бота в webhook-режиме
const bot = new TelegramBot(token, { webHook: true });

// Настраиваем webhook — из переменной окружения или по умолчанию
const webhookUrl = process.env.WEBHOOK_URL || 'https://lovedailybot.netlify.app/.netlify/functions/index';
console.log('Используется webhookUrl:', webhookUrl);

bot.setWebHook(webhookUrl).then(() => {
  console.log('WebHook успешно установлен');
}).catch(err => {
  console.error('Ошибка при установке WebHook:', err);
});

function createInitData(user) {
  const data = {
    user: {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username
    },
    auth_date: Math.floor(Date.now() / 1000),
    query_id: crypto.randomBytes(8).toString('hex'),
  };

  const dataCheckString = Object.keys(data)
    .sort()
    .map(key => `${key}=${JSON.stringify(data[key])}`)
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData')
    .update(token)
    .digest();

  const hash = crypto.createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  return { ...data, hash };
}

// Обработка входящих сообщений (логика аналогична оригинальной)
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  console.log('Получено сообщение:', msg);

  if (text === '/start') {
    const initData = createInitData(msg.from);
    const webAppUrlWithData = `${webAppUrl}?tgWebAppData=${encodeURIComponent(JSON.stringify(initData))}`;
    console.log('Сгенерированный URL:', webAppUrlWithData);
    
    try {
      await bot.sendMessage(chatId, 'Твори любовь❤️', {
        reply_markup: {
          inline_keyboard: [
            [{
              text: 'Перейти в приложение',
              web_app: { url: webAppUrlWithData }
            }]
          ]
        }
      });
      console.log('Сообщение отправлено');
    } catch (err) {
      console.error('Ошибка при отправке сообщения:', err);
    }
  }

  if (msg?.web_app_data?.data) {
    try {
      const data = JSON.parse(msg.web_app_data.data);
      await bot.sendMessage(chatId, "Спасибо за обратную связь");
      await bot.sendMessage(chatId, "Ваша страна: " + data?.country);

      setTimeout(async () => {
        await bot.sendMessage(chatId, "Всю информацию вы получите в этом чате");
      }, 3000);
    } catch (e) {
      console.error('Ошибка при обработке данных web_app_data:', e);
    }
  }
});

// Создаем express-приложение, которое будет обслуживать запросы от Telegram
const app = express();
app.use(express.json());
app.use(cors());

// Логируем входящие запросы для отладки
app.post('/', async (req, res) => {
  console.log('Получен запрос:', req.method);
  console.log('Тело запроса:', req.body);

  try {
    await bot.processUpdate(req.body);
    res.sendStatus(200);
  } catch (error) {
    console.error('Ошибка при обработке обновления:', error);
    res.sendStatus(500);
  }
});

// Экспортируем обработчик для Netlify Functions
module.exports.handler = serverless(app);