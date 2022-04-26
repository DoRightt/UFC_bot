import dotenv from 'dotenv'
dotenv.config();
import { States } from "./models/states.enum";
import { getFighterStat, parseFighterStat, parseNextTournament } from './handlers/main';



process.env.NTBA_FIX_319 = String(1);
// require("dotenv").config();
// const handlers = require('./handlers/main.ts');
const TelegramBot = require('node-telegram-bot-api');
const { TELEGRAM_TOKEN } = process.env;
const bot = new TelegramBot(TELEGRAM_TOKEN, {polling: true});

let state = States.INITIAL;

bot.on('message', (msg) => {
   const chatId = msg.chat.id;

    switch (state) {
        case 0:
            bot.sendMessage(chatId, 'Привет, что хочешь найти?', {
                reply_markup: {
                    inline_keyboard: keyboard
                }
            });
            break;
        case 3:
            const fighterName = msg.text;
            const fighter = getFighterStat(fighterName);

            if (fighter) {
                bot.sendMessage(chatId, parseFighterStat(fighter))
                state = 0;
            } else {
                bot.sendMessage(chatId, 'Боец не найден, проверь верно ли указано имя.')
            }
    }
});

bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const option = query.data;

    switch(option) {
        case 'fighterStat':
            state = 3;
            bot.sendMessage(chatId, 'Введи имя бойца');
            break;
        case 'nextEvent':
            state = 1;
            const message = await parseNextTournament();
            bot.sendMessage(chatId, message);
            break;
    }

    // if (msg) {
    //     bot.sendMessage(chatId, msg, { // прикрутим клаву
    //         reply_markup: {
    //             inline_keyboard: keyboard
    //         }
    //     });
    // } else {
    //     bot.sendMessage(chatId, 'Непонятно, давай попробуем ещё раз?', {
    //         // прикрутим клаву
    //         reply_markup: {
    //             inline_keyboard: keyboard
    //         }
    //     });
    // }

})

const keyboard = [
    [
        {
            text: 'Следующий турнир', // текст на кнопке
            callback_data: 'nextEvent' // данные для обработчика событий
        },
    ],
    [
        {
            text: 'Расписание турниров',
            callback_data: 'eventSchedule',
            // url: 'https://htmlacademy.ru/courses' //внешняя ссылка
        }
    ],
    [
        {
            text: 'Статистика бойца',
            callback_data: 'fighterStat'
        }
    ],
    [
        {
            text: 'Сделать ставку на следующий турнир',
            callback_data: 'tournamentBet'
        }
    ],
]
