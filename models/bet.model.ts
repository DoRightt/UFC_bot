import { Schema, model } from 'mongoose';

export class BetModel {
    id?: number;
    fightId: string;
    userId: string;
    eventId: string;
    bet: string;

    constructor(data: any) {
        // this.id = data.id;
        this.fightId = data.fightId;
        this.userId = data.userId;
        this.eventId = data.eventId;
        this.bet = data.bet
    }
}

const betSchema = new Schema({
    fightId: {
        type: String,
        default: '',
    },
    eventId: {
        type: String,
        default: ''
    },
    bet: {
        type: String,
        default: ''
    },
    userId: {
        type: Schema.Types.ObjectId,
        default: ''
    },
    created_at: {
        type: Number,
        default: Date.now()
    },
    isFightFinished: {
        type: Boolean,
        default: false
    },
    isWin: {
        type: Boolean,
        default: false
    }

}, {collection: 'bets'});

export interface IBet {
    fightId: string;
    userId: string;
    eventId: string;
    bet: string;
    isFightFinished?: boolean;
    isWin?: boolean;
}

const Bet = model<IBet>('Bet', betSchema);

export default Bet;