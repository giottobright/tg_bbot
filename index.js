const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

const token = '8175016977:AAGeuLppm_BrhTAOScFC3fzQ-mRh61VBIyo';
const webAppUrl = 'https://lovedaily.netlify.app/';

const bot = new TelegramBot(token, {polling: true});
const app = express();

app.use(express.json());
app.use(cors());

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

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    console.log('User data:', msg.from);

    if(text === '/start') {
        const initData = createInitData(msg.from);
        const webAppUrlWithData = `${webAppUrl}?tgWebAppData=${encodeURIComponent(JSON.stringify(initData))}`;
        console.log('Generated URL:', webAppUrlWithData);
        
        await bot.sendMessage(chatId, 'Твори любовь❤️', {
            reply_markup: {
                inline_keyboard: [
                    [{
                        text: 'Перейти в приложение',
                        web_app: {
                            url: webAppUrlWithData
                        }
                    }]
                ]
            }
        });
    }

    if(msg?.web_app_data?.data) {
        try {
            const data = JSON.parse(msg?.web_app_data?.data);
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

const PORT = 8007;
app.listen(PORT, () => console.log('Server started on PORT ' + PORT));





