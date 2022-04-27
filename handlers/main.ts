import dotenv from "dotenv";
dotenv.config();
import { Fighter } from "../models/fighter.model";
import { Tournament } from "../models/tournament.model";
import { Fight, IFight } from "../models/fight.model";

const https = require('https');
const Fighters = require('../fighters.js');
const { API_KEY } = process.env
const currentSeason = new Date().getFullYear();
const league = 'UFC';

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
const parseNextTournament = async () => {
    const nextTournamentId = await getNextTournamentId();
    const tournamentData = await getTournamentData(nextTournamentId);
    const fights = tournamentData.Fights.map(getFightFighters);
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

const parseEventDate = (date: Date) => {
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
    return {
        red: fight.Fighters[0],
        blue: fight.Fighters[1]
    }
}

const parseFight = (fight: IFight): string => {
    return `${getFighterFullName(fight.red)} Vs. ${getFighterFullName(fight.blue)}`
}

const parseFightWithFavoriteMark = (fight: IFight): string =>  {
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

const parseTournamentSchedule = async () => {
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

function compareNames(a, b) {
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

const getBetKeyboard = async (): Promise<any> => {
    const nextTournamentId = await getNextTournamentId();
    const tournamentData = await getTournamentData(nextTournamentId);
    const fights = tournamentData.Fights.map(getFightFighters);
    const fightKeyboard = fights.map(fight => {
        return [
            {
                text: getFighterFullName(fight.red),
                callback_data: `${fight.red.FighterId}`
            },
            {
                text: getFighterFullName(fight.blue),
                callback_data: `${fight.blue.FighterId}`
            }
        ]
    });

    return fightKeyboard;
}

export { getFighterStat, parseFighterStat, parseNextTournament, parseTournamentSchedule, getBetKeyboard }
