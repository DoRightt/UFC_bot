import {Fighter} from "./fighter.model";

export class Fight {
    FightId: number;
    Order: number;
    Status: string;
    WeightClass: string;
    CardSegment: string;
    Referee: string;
    Rounds: number;
    ResultType: string;
    WinnerId: number;
    Active: boolean;
    Fighters: Fighter[]
}

export interface IFight {
    red: Fighter;
    blue: Fighter;
}
