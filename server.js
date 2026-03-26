import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import Form from './Model/Form.js';
import User from './Model/User.js';

const app = express();

// ==========================================
//              MIDDLEWARE
// ==========================================
app.use(cors());
app.use(express.json());

// Global Request Logger
app.use((req, res, next) => {
    console.log(`\n======================================================`);
    console.log(`[${new Date().toLocaleTimeString()}] 🚀 [${req.method}] ${req.url}`);

    if (req.body && Object.keys(req.body).length > 0) {
        console.log(`📦 Payload Data:`, req.body);
    }

    console.log(`======================================================`);
    next();
});

// ==========================================
//            DATABASE CONNECTION
// ==========================================
const mongoURI = process.env.MONGODB_URL;

if (!mongoURI) {
    console.error('❌ FATAL ERROR: MONGODB_URL is not defined in the environment.');
    process.exit(1);
}

mongoose.connect(mongoURI)
    .then(() => console.log('✅ Connected to MongoDB! API is ready.'))
    .catch((err) => console.error('❌ MongoDB connection error:', err));

// ==========================================
//              FORM CRUD ROUTES
// ==========================================

// 1. CREATE
app.post('/api/forms', async (req, res) => {
    try {
        const newForm = new Form(req.body);
        const savedForm = await newForm.save();
        res.status(201).json({ message: "Form saved successfully!", data: savedForm });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2. READ ALL
app.get('/api/forms', async (req, res) => {
    try {
        const forms = await Form.find();
        res.status(200).json(forms);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. READ ONE
app.get('/api/forms/:id', async (req, res) => {
    try {
        const form = await Form.findById(req.params.id);
        if (!form) return res.status(404).json({ message: "Form not found" });
        res.status(200).json(form);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4. UPDATE
app.put('/api/forms/:id', async (req, res) => {
    try {
        const updatedForm = await Form.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, strict: false }
        );
        if (!updatedForm) return res.status(404).json({ message: "Form not found" });
        res.status(200).json({ message: "Form updated!", data: updatedForm });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 5. DELETE
app.delete('/api/forms/:id', async (req, res) => {
    try {
        const deletedForm = await Form.findByIdAndDelete(req.params.id);
        if (!deletedForm) return res.status(404).json({ message: "Form not found" });
        res.status(200).json({ message: "Form deleted successfully!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
//              AUTH ROUTES
// ==========================================

// 1. REGISTER
app.post('/api/register', async (req, res) => {
    try {
        const { firstname, lastname, email, password, birthday, address, gender } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User with this email already exists.' });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const newUser = new User({
            firstname, lastname, email, password: hashedPassword, birthday, address, gender
        });

        await newUser.save();
        res.status(201).json({ message: 'User registered successfully!' });

    } catch (error) {
        res.status(500).json({ message: 'Server error during registration.' });
    }
});

// 2. LOGIN
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_change_me_in_production';
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(200).json({
            message: 'Login successful!',
            token,
            user: { firstname: user.firstname, lastname: user.lastname, email: user.email }
        });

    } catch (error) {
        res.status(500).json({ message: 'Server error during login.' });
    }
});
// 3. GET ALL USERS
app.get('/api/users', async (req, res) => {
    try {
        // We use .select('-password') to ensure we don't accidentally send hashed passwords back to the client
        const users = await User.find().select('-password');
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server error while fetching users.', error: error.message });
    }
});
// 4. LOGOUT
app.post('/api/logout', (req, res) => {
    /* Because you are using JWT (JSON Web Tokens), the server doesn't actually store a session. 
      The token lives on the client (frontend). 
      Therefore, "logging out" is essentially just telling the client to delete its token!
    */
    try {
        res.status(200).json({
            message: 'Logout successful! Please remove the JWT token from your client storage (localStorage/cookies).'
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error during logout.', error: error.message });
    }
});
// 5. DELETE A USER
app.delete('/api/users/:id', async (req, res) => {
    try {
        // Find the user by the ID passed in the URL and delete them
        const deletedUser = await User.findByIdAndDelete(req.params.id);
        
        // If the user doesn't exist in the database, return a 404 error
        if (!deletedUser) {
            return res.status(404).json({ message: "User not found." });
        }
        
        // If successful, send back a confirmation message
        res.status(200).json({ message: "User deleted successfully!" });
    } catch (error) {
        res.status(500).json({ message: 'Server error while deleting user.', error: error.message });
    }
});
// 6. UPDATE USER PROFILE
app.put('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Security check: If the user is trying to update their password, 
        // it must be re-hashed before saving.
        if (updates.password) {
            const saltRounds = 10;
            updates.password = await bcrypt.hash(updates.password, saltRounds);
        }

        // findByIdAndUpdate takes (id, data, options)
        // { new: true } returns the document AFTER the update
        // { runValidators: true } ensures the new data follows your Schema rules
        const updatedUser = await User.findByIdAndUpdate(id, updates, { 
            new: true, 
            runValidators: true 
        }).select('-password');

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found.' });
        }

        res.status(200).json({
            message: 'User updated successfully!',
            user: updatedUser
        });

    } catch (error) {
        res.status(500).json({ 
            message: 'Server error while updating user.', 
            error: error.message 
        });
    }
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`\n🚀 Server is running on http://localhost:${PORT}`);
});