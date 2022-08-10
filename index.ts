import dotenv from 'dotenv'
import { States } from "./models/states.enum";
import dbPath from './environment/db';
import {
    betHandler,
    getFighterStat,
    getNextEventBets,
    getSeasonScores,
    parseFighterStat,
    parseNextTournament,
    parseTournamentSchedule,
    setStateByCommand
} from './handlers/main';
import { getKeyboard, KeyboardTypes } from "./handlers/keyboards";
import { CallbackDataType } from "./models/callback-data-type.enum";
import { Commands } from "./models/commands.enum";

dotenv.config();

process.env.NTBA_FIX_319 = String(1);

const mongoose = require('mongoose');
const TelegramBot = require('node-telegram-bot-api');
const { TELEGRAM_TOKEN, ANTON_CHAT_ID, ANDREY_CHAT_ID  } = process.env;
const bot = new TelegramBot(TELEGRAM_TOKEN, {polling: true});
const url = dbPath;

let state = States.INITIAL;

const start = (): void => {
    try {
        mongoose.connect(url, { useNewUrlParser: true, useFindAndModify: false, useUnifiedTopology: true });
    } catch(err) {
        console.log(err);
    }
    const db = mongoose.connection;
    db.on("error", console.error.bind(console, "connection error: "));
    db.once("open", function () {
        console.log("Connected successfully");
    });
}

start();

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text.toLowerCase();

    state = setStateByCommand(text) || state;

    switch (state) {
        case States.INITIAL:
            bot.sendMessage(chatId, `Привет, доступные действия:`, {
                reply_markup: {
                    inline_keyboard: getKeyboard(KeyboardTypes.DEFAULT_KEYBOARD)
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
            break;
        case States.SCORES:
            const scoresMessage = await getSeasonScores();
            bot.sendMessage(chatId, scoresMessage);
    }
});

bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const option = query.data;
    const callBackDataType = Number(option[0]);

    switch (callBackDataType) {
        case CallbackDataType.BET:
            const betData = JSON.parse(option.substring(1));
            betHandler(betData, chatId).then(res => {
                const opponentChatId = Number(chatId) === Number(ANTON_CHAT_ID) ? ANDREY_CHAT_ID : ANTON_CHAT_ID;
                const userName = Number(chatId) === Number(ANTON_CHAT_ID) ? 'Антон' : 'Андрей';
                bot.sendMessage(chatId, res.mainMessage);
                if (res.opponentMessage) {
                    const message = `${userName} ${res.opponentMessage}`;
                    bot.sendMessage(Number(opponentChatId), message);
                }
            });
    }

    switch(Number(option)) {
        case States.FIGHTER_STAT:
            state = States.FIGHTER_STAT;
            bot.sendMessage(chatId, 'Введи имя бойца');
            break;
        case States.NEXT_TOURNAMENT:
            state = States.NEXT_TOURNAMENT;
            const tournamentMessage = await parseNextTournament();
            bot.sendMessage(chatId, tournamentMessage);
            break;
        case States.TOURNAMENT_SCHEDULE:
            state = States.TOURNAMENT_SCHEDULE;
            const tournamentsMessage = await parseTournamentSchedule();
            bot.sendMessage(chatId, tournamentsMessage);
            break;
        case States.TOURNAMENT_BET:
            state = States.TOURNAMENT_BET;
            const kb = await getKeyboard(KeyboardTypes.BET_KEYBOARD);
            bot.sendMessage(chatId, 'Выбери бойца:', {
                reply_markup: {
                    inline_keyboard: kb
                }
            });
            break;
        case States.NEXT_EVENT_BETS:
            state = States.NEXT_EVENT_BETS;
            const nextEventMessage = await getNextEventBets();
            bot.sendMessage(chatId, nextEventMessage);
            break;
        case States.SCORES:
            state = States.SCORES
            const scoresMessage = await getSeasonScores();
            bot.sendMessage(chatId, scoresMessage);
            break;
    }
})
