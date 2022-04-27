import dotenv from 'dotenv'
import {States} from "./models/states.enum";
import { getFighterStat, parseFighterStat, parseNextTournament, parseTournamentSchedule, getBetKeyboard } from './handlers/main';

dotenv.config();

process.env.NTBA_FIX_319 = String(1);

const TelegramBot = require('node-telegram-bot-api');
const { TELEGRAM_TOKEN } = process.env;
const bot = new TelegramBot(TELEGRAM_TOKEN, {polling: true});

let state = States.INITIAL;

bot.on('message', (msg) => {
   const chatId = msg.chat.id;

    switch (state) {
        case States.INITIAL:
            bot.sendMessage(chatId, 'Привет, что хочешь найти?', {
                reply_markup: {
                    inline_keyboard: keyboard
                }
            });
            break;
        case States.FIGHTER_STAT:
            const fighterName = msg.text;
            const fighter = getFighterStat(fighterName);

            if (fighter) {
                bot.sendMessage(chatId, parseFighterStat(fighter))
                state = States.INITIAL;
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
            state = States.FIGHTER_STAT;
            bot.sendMessage(chatId, 'Введи имя бойца');
            break;
        case 'nextEvent':
            state = States.NEXT_TOURNAMENT;
            const tournamentMessage = await parseNextTournament();
            bot.sendMessage(chatId, tournamentMessage);
            break;
        case 'eventSchedule':
            state = States.TOURNAMENT_SCHEDULE;
            const tournamentsMessage = await parseTournamentSchedule();
            bot.sendMessage(chatId, tournamentsMessage);
            break;
        case 'tournamentBet':
            state = States.TOURNAMENT_BET;
            const kb = await getBetKeyboard();
            bot.sendMessage(chatId, 'Выбери бойца:', {
                reply_markup: {
                    inline_keyboard: kb
                }
            })
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
];
