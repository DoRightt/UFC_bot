import dotenv from "dotenv";
import { Fighter } from "../models/fighter.model";
import { Tournament } from "../models/tournament.model";
import { Fight, IFight } from "../models/fight.model";
import { BetModel, IBet } from "../models/bet.model";
import { UserModel } from "../models/user.model";
import { Commands } from "../models/commands.enum";
import { States } from "../models/states.enum";

import https from "https";
import Fighters from "../fighters.js"

dotenv.config();

const { API_KEY, ANTON_CHAT_ID, ANTON_USER_ID, ANDREY_CHAT_ID, ANDREY_USER_ID, PLAYER_ONE_NAME, PLAYER_TWO_NAME } = process.env
const currentSeason = new Date().getFullYear();
const league = 'UFC';
const User = require('../models/user.model.ts');
const Bet = require('../models/bet.model.ts');
const ObjectId = require('mongoose').Types.ObjectId;

const defaultScores = {
    ANTON: 4,
    ANDREY: 6
}

const getFighterStat = (name: string): Fighter => {
    const [firstName, secondName] = name.split(' ');
    const fighter = Fighters.find(f => {
        if (compareNames(f.FirstName, firstName) && compareNames(f.LastName, secondName)) {
            return f;
        }

        return null;
    })

    return fighter;
}

const parseFighterStat = (fighter: Fighter): string => {
    if (!fighter) {
        return 'Боец не найден';
    }
    const stat = `Имя: ${fighter.FirstName} ${fighter.LastName} \n` +
        `Боев: ${fighter.Wins + fighter.Losses + fighter.Draws} \n` +
        `Статистика (W-L-D): ${fighter.Wins} / ${fighter.Losses} / ${fighter.Draws}`;

    return stat
}
const parseNextTournament = async (): Promise<string> => {
    const nextTournamentId = await getNextTournamentId();
    const tournamentData = await getTournamentData(nextTournamentId);
    const fights = tournamentData.Fights.filter(fight => fight.Fighters.length).map(getFightFighters)
    const mainEvent = fights[0];
    const coMainEvent = fights[1];
    const otherFights = fights.slice(2);
    const result = `Следующий турнир: ${parseTournament(tournamentData)} \n\n` +
        `Main Event: \n` +
        `${parseFightWithFavoriteMark(mainEvent)} \n\n` +
        `Co Main Event: \n` +
        `${parseFightWithFavoriteMark(coMainEvent)} \n\n` +
        `Остальные бои: \n` +
        `${parseTournamentFights(otherFights)}`

    return result;
}

const parseEventDate = (date: Date): string => {
    const dayNames = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота']
    const monthNames = ['Января', 'Февраля', 'Марта', 'Апреля', 'Мая', 'Июня',
        'Июля', 'Августа', 'Сентября', 'Октября', 'Ноября', 'Декабря'
    ];
    const day = date.getDay();
    const dt = date.getDate();
    const month = date.getMonth();
    const hours = ('0' + date.getHours()).slice(-2);
    const minutes = ('0' + date.getMinutes()).slice(-2);

    return `${dayNames[day]}, ${dt} ${monthNames[month]} в ${hours}:${minutes}`
}

const getFightFighters = (fight: Fight): IFight => {
    if (!fight.Fighters.length) {
        return null;
    }

    return {
        fightId: fight.FightId,
        red: fight.Fighters[0],
        blue: fight.Fighters[1]
    }
}

const parseFight = (fight: IFight): string => {
    return `${getFighterFullName(fight.red)} Vs. ${getFighterFullName(fight.blue)}`
}

const parseFightWithFavoriteMark = (fight: IFight): string =>  {
    if (!fight) {
        return `Бой не назначен`;
    }
    const favorite = getFavorite(fight);

    if (favorite.FighterId === fight.red.FighterId) {
        return `[F] ${parseFight(fight)}`
    } else {
        return `${parseFight(fight)} [F]`
    }
}

const parseTournamentFights = (fights: IFight[]): string => {
    const fightsAsStrings = fights.map(parseFight);
    return fightsAsStrings.join('\n\t');
}

const parseTournamentSchedule = async (): Promise<string> => {
    const tournaments = await getSeasonTournamentData(league, currentSeason);
    const futureTournaments = getFutureTournaments(tournaments);
    const tournamentsStrings = futureTournaments.map(parseTournament);

    return tournamentsStrings.join('\n\n')
}

const parseTournament = (tournament: Tournament): string => {
    return `${tournament.Name} \n` +
        `Состоится: ${parseEventDate(new Date(tournament.DateTime))}`
}

const getFavorite = (fight: IFight): Fighter => {
    const favorite = fight.red.MoneyLine < fight.blue.MoneyLine ? fight.red : fight.blue;
    return favorite;
}

const getFighterFullName = (fighter: Fighter): string => {
    if (!fighter) {
        return 'Unknown fighter';
    }
    return `${fighter.FirstName} ${fighter.LastName}`
}

const getNextTournamentData = async (): Promise<Tournament> => {
    const tournaments = await getSeasonTournamentData(league, currentSeason);
    const futureTournaments = getFutureTournaments(tournaments);
    const nextTournament = futureTournaments[0];

    return nextTournament;
}

const getNextTournamentId = async (): Promise<number> => {
    const nextTournament = await getNextTournamentData();
    return nextTournament.EventId;
}

const compareNames = (a, b): boolean => {
    return a.toLowerCase() === b.toLowerCase();
}

const getSeasonTournamentData = async (league, season): Promise<any> => {
    const url = `https://api.sportsdata.io/v3/mma/scores/json/Schedule/${league}/${season}?key=${API_KEY}`;
    const seasonTournaments = await doRequest(url);
    return seasonTournaments;
}

const getTournamentData = async (id: number): Promise<Tournament> => {
    const url = `https://api.sportsdata.io/v3/mma/scores/json/Event/${id}?key=${API_KEY}`;
    const data = await doRequest(url);
    return data;
}

const doRequest = async (url): Promise<any> => {
    return new Promise((resolve, reject) => {
        const req = https.get(url, (res) => {
            res.setEncoding('utf8');
            let responseBody = '';

            res.on('data', (chunk) => {
                responseBody += chunk;
            });

            res.on('end', () => {
                resolve(JSON.parse(responseBody));
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        req.end();
    });
}

const getFinishedTournaments = (tournaments: Tournament[]): Tournament[] => {
    const finishedTournaments = tournaments.filter(event => {
        return event.Status === 'Final';
    })

    return finishedTournaments;
}

const getFutureTournaments = (tournaments: Tournament[]): Tournament[] => {
    const futureTournaments = tournaments.filter(event => {
        return event.Status !== 'Final';
    })

    return futureTournaments;
}

const getFightName = (fight: IFight): string => {
    return `${getFighterFullName(fight.red)} Vs. ${getFighterFullName(fight.blue)}`
}

const getFighterById = (id: number | string): Fighter => {
    const fighter = Fighters.find(fighter => fighter.FighterId === Number(id));

    return fighter;
}

const getFightById = async (id: number): Promise<Fight> => {
    const url = `https://api.sportsdata.io/v3/mma/stats/json/Fight/${id}?key=${API_KEY}`;
    const fight = await doRequest(url);

    return fight;
}

const betHandler = async (options, chatId) => {
    const nextEventId = await getNextTournamentId();
    const currentUser = await getCurrentUser(chatId);
    const fight = await getFightById(options.fightId);
    const alreadyFinished = fight.WinnerId || !fight.Active;

    if (alreadyFinished) {
        return {
            mainMessage: "Невозможно сделать ставку, этот бой уже завершен или отменен."
        }
    }

    const bet = {
        fightId: options.fightId,
        bet: options.bet,
        userId: ObjectId(currentUser._id),
        eventId: String(nextEventId)
    }

    return makeBet(bet);
}

const getUsers = async (filter: any = {}) => {
    return User.find(filter, (err, res) => {
        if (err) {
            res.status(500).send(`Error: ${err.message}`);
            return null;
        } else {
            return res;
        }
    });
}

const getCurrentUser = async (chatId: string | number) => {
    const userName = Number(chatId) === Number(ANTON_CHAT_ID) ? 'Anton' : 'Andrey';
    const user = (await getUsers({name: userName}))[0];
    return user;
}

const getBets = async (filter: any = {}) => {
    return Bet.find(filter, (err, res) => {
        if (err) {
            res.status(500).send(`Error: ${err.message}`);
            return null;
        } else {
            return res;
        }
    })
}

const updateBet = async (bet, updData) => {
    const filter = { _id: ObjectId(bet._id) };

    return Bet.findOneAndUpdate(filter, updData, {}, (err, res) => {
        if (err) {
            console.log('Произошла ошибка: ', err );
        } else {
            console.log('Ставка обновлена: ', res);
        }
    });
}

const updateBets = async (bets) => {
    if (!bets.length) {
        console.log('Ставки не нуждаются в обновлении');
        return;
    }
    await bets.forEach(bet => {
        setBetResult(bet)
    })

    const updatedBets = await getBets();

    console.log('Ставки обновлены');

    return updatedBets;
}

const makeBet = async (bet: IBet): Promise<any> => {
    const newBet = new Bet({
        fightId: bet.fightId,
        userId: bet.userId,
        eventId: bet.eventId,
        bet: bet.bet,
        created_at: Date.now()
    });
    const fightName = await getFightNameById(bet.fightId);

    return new Promise((res, rej) => {
        getBets({ fightId: bet.fightId, userId: bet.userId })
            .then(bets => {
                const hasBets = Boolean(bets.length);
                const fighterId = newBet.bet;
                const fighter = Fighters.find(fighter => String(fighter.FighterId) === fighterId);
                const fighterName = getFighterFullName(fighter);
                if (hasBets) {
                    const isBetAlreadyExists = bets.find(bet => bet.bet === fighterId);
                    if (isBetAlreadyExists) {
                        console.log(`Ты уже делал ставку на ${fighterName} этом бою`);
                        res({
                            mainMessage: `Ты уже делал ставку на ${fighterName} этом бою`
                        });
                    } else {
                        const myBet = bets[0];
                        Bet.updateOne(myBet, { bet: fighterId }).then(() => {

                            console.log(`Ставка была изменена на ${fighterName}`);
                            res({
                                mainMessage: `Ставка была изменена на ${fighterName}`,
                                opponentMessage: `изменил ставку на ${fighterName} в бою: ${fightName}`
                            });
                        })
                    }
                } else {
                    newBet.save()
                        .then(() => {
                            console.log(`Bet was successfully created.`);
                            res({
                                mainMessage: `Ставка на ${fighterName} была успешно записана.`,
                                opponentMessage: `сделал ставку на ${fighterName} в бою: ${fightName}`
                            });
                        })
                        .catch(err => {
                            console.log(`Status: 500; error: ${err.message}`);
                            rej(`Произошла ошибка: ${err.message}`);
                        })
                }
            })
    })
}

const getBetsByUser = async (name: string) => {
    const users = await getUsers({name: name});
    const curUser = users[0];
    const betIds = curUser.bets;

    return Bet.find({
        '_id': { $in: betIds }
    });
}

const getSeasonBets = async () => {
    const seasonEvents = await getSeasonTournamentData(league, currentSeason);
    const seasonEventIds = seasonEvents.map(event => event.EventId);

    return Bet.find({
        'eventId': { $in: seasonEventIds }
    });
}

const checkPassword = (user: UserModel, password: string): boolean => {
    return String(user.password) === String(password);
}

const getSeasonScores = async (): Promise<string> => {
    const bets = await getBets();
    const nextEventId = await getNextTournamentId();
    const noResultBets = bets.filter(bet => !bet.isFightFinished);
    const finishedBets = noResultBets.filter(bet => Number(bet.eventId) < nextEventId);

    const updatedBets = await updateBets(finishedBets);

    const antonBets = updatedBets.filter(bet => bet.userId.toString() === ANTON_USER_ID);
    const andreyBets = updatedBets.filter(bet => bet.userId.toString() === ANDREY_USER_ID);
    const fightIdsOfValidBets = getFightIdsOfValidBets(antonBets, andreyBets);
    const validBets = updatedBets.filter(bet => fightIdsOfValidBets.includes(bet.fightId));
    const successValidBets = validBets.filter(bet => bet.isWin);

    let antonScores = defaultScores.ANTON;
    let andreyScores = defaultScores.ANDREY;

    for (let bet of successValidBets) {
        if (bet.userId.toString() === ANTON_USER_ID) {
            ++antonScores;
        }

        if (bet.userId.toString() === ANDREY_USER_ID) {
            ++andreyScores;
        }
    }

    return `${PLAYER_TWO_NAME} ${andreyScores} - ${antonScores} ${PLAYER_ONE_NAME}`
}

const setBetResult = async (bet) => {
    const betFight = await getFightById(bet.fightId);
    const hasResult = Boolean(betFight.WinnerId) || !betFight.Active;

    if (hasResult) {
        const winnerId = getWinnerId(betFight) ;
        const updData = {
            isFightFinished: true,
            isWin: Number(winnerId) === Number(bet.bet)
        }

        return updateBet(bet, updData);
    }
}

const getWinner = (fight: Fight): Fighter => {
    return fight.Fighters.find(fighter => fighter.Winner) || null;
}

const getWinnerId = (fight: Fight): number => {
    const winner = getWinner(fight);
    console.log(winner, fight, 'winner')
    return winner ? winner.FighterId : null;
}

const getNextEventBets = async (): Promise<string> => {
    const bets = await getBets();
    const nextEventId = await getNextTournamentId();
    const nextEventBets = bets.filter(bet => Number(bet.eventId) === nextEventId);
    const antonBets = nextEventBets.filter(bet => bet.userId.toString() === ANTON_USER_ID);
    const andreyBets = nextEventBets.filter(bet => bet.userId.toString() === ANDREY_USER_ID);
    const fightIdsOfValidBets = getFightIdsOfValidBets(antonBets, andreyBets);
    const antonValidBets = antonBets.filter(bet => fightIdsOfValidBets.includes(bet.fightId));
    const andreyValidBets = andreyBets.filter(bet => fightIdsOfValidBets.includes(bet.fightId));

    const fightBets = await Promise.all(fightIdsOfValidBets.map(async (id): Promise<any> => {
        const name = await getFightNameById(id);
        const antonBet = getFighterById(antonValidBets.find(bet => bet.fightId === id).bet);
        const andreyBet = getFighterById(andreyValidBets.find(bet => bet.fightId === id).bet);
        const bet = {
            name,
            antonFighterName: getFighterFullName(antonBet),
            andreyFighterName: getFighterFullName(andreyBet),
        }
        return bet;
    }));

    const parsedBets = fightBets.map((bet, index) => {
        return `${index + 1}. Бой: ${bet.name}\n` +
            `${PLAYER_ONE_NAME} поставил на: ${bet.antonFighterName}\n` +
            `${PLAYER_TWO_NAME} поставил на: ${bet.andreyFighterName}\n`
    })

    return parsedBets.join('\n') || 'На следующий турнир ставки отстутствуют или совпадают.'
}

const getFightNameById = async (id: number | string): Promise<string> => {
    const nId = Number(id);
    const fight = await getFightById(nId);
    const fightFighters = await getFightFighters(fight);
    const fightName = await getFightName(fightFighters);

    return fightName;
}

const getFightIdsOfValidBets = (xBets, yBets): string[] => {
    return getFightsOfValidBets(xBets, yBets).map(bet => bet.fightId);
}

const getFightsOfValidBets = (xBets, yBets) => {
    return xBets.filter(xBet => {
        return yBets.find(yBet => {
            const isSameFight = yBet.fightId === xBet.fightId;
            const isDifferentFighter = yBet.bet !== xBet.bet;

            return isSameFight && isDifferentFighter;
        })
    })
}

const setStateByCommand = (command: Commands) => {
    switch (command) {
        case Commands.START:
            return States.INITIAL;
        case Commands.NEXT:
            return States.NEXT_TOURNAMENT;
        case Commands.SCHEDULE:
            return States.TOURNAMENT_SCHEDULE;
        case Commands.FIGHTER_STAT:
            return States.FIGHTER_STAT;
        case Commands.BET:
            return States.TOURNAMENT_BET;
        case Commands.NEXT_EVENT_BETS:
            return States.NEXT_EVENT_BETS;
        case Commands.SCORES:
            return States.SCORES;
        default:
            return null;
    }
}

const checkIsCommand = (text: string): boolean => {
    return text.startsWith('/');
}

export {
    getFighterStat,
    parseFighterStat,
    parseNextTournament,
    parseTournamentSchedule,
    getNextTournamentId,
    getTournamentData,
    getFightFighters,
    getFighterFullName,
    betHandler,
    getUsers,
    getBets,
    makeBet,
    getBetsByUser,
    getSeasonBets,
    checkPassword,
    setStateByCommand,
    getNextEventBets,
    checkIsCommand,
    getSeasonScores
}
