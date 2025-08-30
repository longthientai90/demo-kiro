import * as mongoose from 'mongoose';

export const AccountSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  password: { type: String, required: true },
});

export interface Account extends mongoose.Document {
  id: string;
  userId: string;
  userName: string;
  password: string;
}
