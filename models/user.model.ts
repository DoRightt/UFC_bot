import { Schema, model } from 'mongoose';
import { BetModel } from "./bet.model";

export class UserModel {
    id?: number;
    name: string;
    password: string;
    bets: BetModel[];

    constructor(data: any) {
        this.id = data.id;
        this.name = data.name;
        this.password = data.password;
        this.bets = data.bets
    }
}

const userSchema = new Schema({
    name: String,
    password: String,
    bets: Array
}, {collection: 'users'})

interface IUser {
    id?: number,
    name: string,
    password: string,
    bets: BetModel[]
}

const User = model<IUser>('User', userSchema);

export default User;