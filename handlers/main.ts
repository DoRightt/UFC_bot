import { Fighter } from "../models/fighter.model";
import { Tournament } from "../models/tournament.model";

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
    const nextTournament = await getNextTournamentData();
    const result = `Следующий турник: ${nextTournament.Name} \n` +
        `Состоится: ${new Date(nextTournament.DateTime)}`

    console.log(result, 'res')
    return result;
}

const getNextTournamentData = async () => {
    const tournaments = await getSeasonTournamentData(league, currentSeason);
    const futureTournaments = getFutureTournaments(tournaments);
    const nextTournament = futureTournaments[0];

    return nextTournament;
}

function compareNames(a, b) {
    return a.toLowerCase() === b.toLowerCase();
}

async function getSeasonTournamentData(league, season): Promise<any> {
    const url = `https://api.sportsdata.io/v3/mma/scores/json/Schedule/${league}/${season}?key=${API_KEY}`;
    const seasonTournaments = await doRequest(url);
    return seasonTournaments;
}

async function doRequest(url): Promise<any> {
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

function getFinishedTournaments(tournaments: Tournament[]) {
    const finishedTournaments = tournaments.filter(event => {
        return event.Status === 'Final';
    })
}

function getFutureTournaments(tournaments: Tournament[]) {
    const futureTournaments = tournaments.filter(event => {
        return event.Status !== 'Final';
    })

    return futureTournaments;
}

export { getFighterStat, parseFighterStat, parseNextTournament }
