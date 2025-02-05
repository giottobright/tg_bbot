const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const serverless = require('serverless-http');

// Используем токен из переменных окружения
const token = process.env.BOT_TOKEN;
const webAppUrl = 'https://lovedaily.netlify.app/';

// Создаем экземпляр бота в webhook-режиме (вместо polling)
const bot = new TelegramBot(token, { webHook: true });

// Настраиваем webhook — URL должен указывать на серверлес-функцию
const webhookUrl = process.env.WEBHOOK_URL || 'https://lovedailybot.netlify.app/.netlify/functions/index';
bot.setWebHook(webhookUrl);

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

// Обработка входящих сообщений (логика остается такой же, как и в вашем index.js)
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  console.log('User data:', msg.from);

  if (text === '/start') {
    const initData = createInitData(msg.from);
    const webAppUrlWithData = `${webAppUrl}?tgWebAppData=${encodeURIComponent(JSON.stringify(initData))}`;
    console.log('Generated URL:', webAppUrlWithData);

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
  }

  if (msg?.web_app_data?.data) {
    try {
      const data = JSON.parse(msg.web_app_data.data);
      await bot.sendMessage(chatId, "Спасибо за обратную связь");
      await bot.sendMessage(chatId, "Ваша страна: " + data?.country);

      setTimeout(async () => {
        await bot.sendMessage(chatId, "Всю информацию вы получите в этом чате");
      }, 3000);
    } catch(e) {
      console.log(e);
    }
  }
});

// Создаем express-приложение, которое будет вызываться как серверлес-функция
const app = express();
app.use(express.json());
app.use(cors());

// Обработка POST-запросов от Telegram (webhook)
app.post('/', async (req, res) => {
  try {
    // Передаем обновление от Telegram в бот
    await bot.processUpdate(req.body);
    res.sendStatus(200);
  } catch (error) {
    console.error('Ошибка при обработке обновления:', error);
    res.sendStatus(500);
  }
});

// Экспортируем обработчик Netlify Functions
module.exports.handler = serverless(app);