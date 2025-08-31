import * as mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';

export const AccountSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  userName: { type: String, required: true, unique: true },
  password: { type: String, required: true, minlength: 8 },
}, {
  timestamps: true
});

// Pre-save middleware for password hashing
AccountSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Instance method for password comparison
AccountSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export interface Account extends mongoose.Document {
  id: string;
  userId: string;
  userName: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}
