// Model/User.js
import mongoose from 'mongoose'; // <-- Changed to import

const userSchema = new mongoose.Schema({
    firstname: { type: String, required: true },
    lastname: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    birthday: { type: Date },
    address: { type: String },
    gender: { type: String }
}, { timestamps: true });

export default mongoose.model('User', userSchema); // <-- Changed to export default