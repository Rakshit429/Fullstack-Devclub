const express = require('express');
const router = express.Router(); // You correctly created the router here.
const User = require('../models/user');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const { protect } = require('../middleware/authMiddleware');
const admin = require('firebase-admin');

// Joi schemas and generateToken function are fine, no changes needed here.
const userschema = Joi.object({
    username: Joi.string().required(),
    password: Joi.string().required(),
    email: Joi.string().email({ minDomainSegments: 2 }).required(),
    firebaseUid: Joi.string().required()
});

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
});

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

const cookieOptions = {
    httpOnly: true, // The cookie is not accessible via client-side JS
    secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in production
    sameSite: 'strict', // Helps mitigate CSRF attacks
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
};

router.post('/register', async (req, res) => {
    try {
        const { error } = userschema.validate(req.body);
        if (error) {
            return res.status(400).send(error.details[0].message);
        }
        const { username, email, password , firebaseUid } = req.body;
        console.log('Registering user:', { username, email });
        const userExists = await User.findOne({ email });
        if (userExists) {
            console.log('User with this email already exists');
            return res.status(400).json({ message: 'User with this email already exists' });

        }
        const usernameExists = await User.findOne({ username });
        if (usernameExists) {
            console.log('Username is already taken');
            return res.status(400).json({ message: 'Username is already taken' });
        }

        const user = await User.create({
            username,
            email,
            password,
            firebaseUid,
        });
        if (user) {
            res.status(201).json({
                _id: user._id,
                username: user.username,
                email: user.email,
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});


// Use 'router' and relative path '/login'
router.post('/login', async (req, res) => {
    try {
        const { error } = loginSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ message: error.details[0].message });
        }

        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (user && (await user.matchPassword(password))) {
            const token = generateToken(user._id);
            res.cookie('token', token, cookieOptions);
            res.status(200).json({
                _id: user._id,
                username: user.username,
                email: user.email,
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

router.post('/logout', (req, res) => {
    // To log out, we clear the cookie
    res.cookie('token', '', {
        httpOnly: true,
        expires: new Date(0) // Set expiry date to the past
    });
    res.status(200).json({ message: 'Logged out successfully' });
});

// Use 'router' and relative path '/profile'
router.get('/profile', protect, (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Not authorized, no user found' });
    }
    res.status(200).json(req.user);
});


router.put('/profile', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            const updates = {};
            const firebaseAuthUpdates = {};

            // --- Check for changes and prepare updates ---
            if (req.body.username && req.body.username !== user.username) {
                updates.username = req.body.username;
            }
            if (req.body.email && req.body.email !== user.email) {
                updates.email = req.body.email;
                firebaseAuthUpdates.email = req.body.email;
            }
            if (req.body.password) {
                updates.password = req.body.password;
                firebaseAuthUpdates.password = req.body.password;
            }
            
            // --- 1. Update Firebase Authentication (if needed) ---
            if (Object.keys(firebaseAuthUpdates).length > 0) {
                await admin.auth().updateUser(user.firebaseUid, firebaseAuthUpdates);
            }

            // --- 2. Update Firebase Realtime Database (if username changed) ---
            if (updates.username) {
                const db = admin.database();
                const userStatusRef = db.ref(`/ChatUsers/Users/${user.firebaseUid}`);
                await userStatusRef.update({ username: updates.username });
            }

            // --- 3. Update MongoDB ---
            user.username = updates.username || user.username;
            user.email = updates.email || user.email;
            if (updates.password) {
                user.password = updates.password;
            }
            
            const updatedUser = await user.save();

            // --- 4. Respond to client ---
            res.status(200).json({
                _id: updatedUser._id,
                username: updatedUser.username,
                email: updatedUser.email,
            });

        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        // Provide more specific error messages for Firebase errors
        if (error.code === 'auth/email-already-exists') {
            return res.status(400).json({ message: 'The email address is already in use by another account.' });
        }
        res.status(500).json({ message: 'Server Error during profile update.' });
    }
});

// Use 'router' and relative path '/profile'
router.delete('/profile', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        await user.deleteOne();

        res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting profile:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// I assume this route should fetch all users.
// Use 'router' and a relative path. Let's make it '/'.
// This will correspond to a GET request to '/api/auth/'
router.get('/', protect, async (req, res) => {
    try {
        const users = await User.find({}).select('-password'); // Exclude password field
        res.status(200).json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// CHANGE 3: Export the 'router', not 'app'.
module.exports = router;