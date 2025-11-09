import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String },
  accountType: { type: String, enum: ['investor', 'borrower'], required: true },
  age: { type: Number },
  phone: { type: String },
  provider: { type: String, default: 'local' },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;
