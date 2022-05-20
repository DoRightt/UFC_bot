import {
    getNextTournamentId,
    getTournamentData,
    getFightFighters,
    getFighterFullName, getUsers
} from './main';
import { CallbackDataType } from "../models/callback-data-type.enum";

const getDefaultKeyboard = () => {
    return [
        [
            {
                text: 'Следующий турнир',
                callback_data: 'nextEvent'
            },
        ],
        [
            {
                text: 'Расписание турниров',
                callback_data: 'eventSchedule',
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
        [
            {
                text: 'Показать разницу в ставках на следующий турнир',
                callback_data: 'nextEventBets'
            }
        ],
        [
            {
                text: 'Показать счет за год',
                callback_data: 'showScores'
            }
        ],
    ];
}

const getBetKeyboard = async (): Promise<any> => {
    const nextTournamentId = await getNextTournamentId();
    const tournamentData = await getTournamentData(nextTournamentId);
    const fights = tournamentData.Fights.filter(fight => fight.Fighters.length).map(getFightFighters);
    const fightKeyboard = fights.map(fight => {
        return [
            {
                text: getFighterFullName(fight.red),
                callback_data: CallbackDataType.BET + JSON.stringify({
                    fightId: fight.fightId,
                    bet: fight.red.FighterId,
                })
            },
            {
                text: getFighterFullName(fight.blue),
                callback_data: CallbackDataType.BET + JSON.stringify({
                    fightId: fight.fightId,
                    bet: fight.blue.FighterId,
                })
            }
        ]
    });

    return fightKeyboard;
}

const getUsersKeyboard = async () => {
    const users = await getUsers();
    const userA = users[0];
    const userB = users[1];
    return [
        [
            {
                text: userA.name,
                callback_data: CallbackDataType.USER + JSON.stringify({
                    name: userA.name,
                })
            },
            {
                text: userB.name,
                callback_data: CallbackDataType.USER + JSON.stringify({
                    name: userB.name,
                })
            }
        ]
    ]
}

export const getKeyboard = (kbType: KeyboardTypes) => {
    switch (kbType) {
        case KeyboardTypes.BET_KEYBOARD:
            return getBetKeyboard();
        case KeyboardTypes.DEFAULT_KEYBOARD:
            return getDefaultKeyboard();
        // case KeyboardTypes.USER_KEYBOARD:'
        //     return getUsersKeyboard();'
    }
}

export enum KeyboardTypes {
    DEFAULT_KEYBOARD,
    BET_KEYBOARD,
    USER_KEYBOARD
}