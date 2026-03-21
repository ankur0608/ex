import mongoose from 'mongoose';

// By passing { strict: false }, we allow the user to send ANY custom fields and values.
const formSchema = new mongoose.Schema({
    // Dynamic fields go here
}, { strict: false, timestamps: true });

export default mongoose.model('Form', formSchema);