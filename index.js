const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const cors = require('cors');


const token = '7450002060:AAH5_zeOV1dnWjO8d1Lz1xPLhgVIcTcIgWU';
const webAppUrl = 'https://main--melodious-smakager-19f895.netlify.app/';

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, {polling: true});
const app = express();

app.use(express.json())
app.use(cors())

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if(text === '/start'){
    await bot.sendMessage(chatId, 'Ниже появится форма для заполнения', {
        reply_markup: {
            keyboard: [
                [{text: 'Заполнить форму', web_app: {url: webAppUrl + 'form'}}]
            ]
        }
    })


    await bot.sendMessage(chatId, 'Ниже появится форма для заполнения', {
        reply_markup: {
            inline_keyboard: [
                [{text: 'Сделать заказ', web_app: {url: webAppUrl}}]
            ]
        }
    })
  }

  if(msg?.web_app_data?.data) {
    try {
        const data = JSON.parse(msg?.web_app_data?.data)

        await bot.sendMessage(chatId, "Спасибо за обратную связь")
        await bot.sendMessage(chatId, "Ваша страна" + data?.country)

        setTimeout( async ()  =>  {
            await bot.sendMessage("Всю информацию вы получите в этом чате")
        }, 3000)
    } catch(e) {
        console.log(e);
  }}

  // send a message to the chat acknowledging receipt of their message

});

app.post('/web-data', (req, res)=> {
    const {queryId, products, totalPrice} = req.body;

    try {
        bot.answerWebAppQuery(queryId, {
            type: 'article',
            id: queryId,
            title: 'Успешная покупка',
            input_message_content: {message_text: 'Поздравляю с покупкой'}
        });

        return res.status(200);
    } catch (e) {
        bot.answerWebAppQuery(queryId, {
            type: 'article',
            id: queryId,
            title: 'Не удалось приобрести',
            input_message_content: {message_text: 'Не удалось приобрести товар'}
        });

        return res.status(500).json({});
    }


})

const PORT = 3000;
app.listen(PORT, () =>  console.log(`Server is running on port ${PORT}`));





