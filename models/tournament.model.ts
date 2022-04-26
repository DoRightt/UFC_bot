import {Fight} from "./fight.model";

export class Tournament {
    EventId: number;
    LeagueId: number;
    Name: string;
    ShortName: string;
    Season: number;
    Day: Date;
    DateTime: Date;
    Status: string;
    Active: boolean;
    Fights: Fight[];
}
