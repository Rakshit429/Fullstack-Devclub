const express = require('express');
const router = express.Router(); // You correctly created the router here.
const User = require('../models/user');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const { protect } = require('../middleware/authMiddleware');

// Joi schemas and generateToken function are fine, no changes needed here.
const userschema = Joi.object({
    username: Joi.string().required(),
    password: Joi.string().pattern(new RegExp('^[a-zA-Z0-9]{3,30}$')).required(),
    email: Joi.string().email({ minDomainSegments: 2 }).required(),
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

// --- FIXES START HERE ---

// CHANGE 1: Use 'router', not 'app'.
// CHANGE 2: The path is now relative, so it's '/register', not the full path.
router.post('/register', async (req, res) => {
    try {
        const { error } = userschema.validate(req.body);
        if (error) {
            return res.status(400).send(error.details[0].message);
            console.log(error.details[0].message);
        }
        console.log('Request body:', req.body); // Debugging line to check the request body
        const { username, email, password } = req.body;
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
        });
        if (user) {
            res.status(201).json({
                _id: user._id,
                username: user.username,
                email: user.email,
                token: generateToken(user._id),
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
            console.log('Invalid user data');
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
            res.status(200).json({
                _id: user._id,
                username: user.username,
                email: user.email,
                token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

// Use 'router' and relative path '/profile'
router.get('/profile', protect, (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Not authorized, no user found' });
    }
    res.status(200).json(req.user);
});

// Use 'router' and relative path '/profile'
router.put('/profile', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id); // It's safer to re-fetch the user
        if (user) {
            user.username = req.body.username || user.username;
            user.email = req.body.email || user.email;
            if (req.body.password) {
                user.password = req.body.password;
            }
            const updatedUser = await user.save();
            res.status(200).json({
                _id: updatedUser._id,
                username: updatedUser.username,
                email: updatedUser.email,
                token: generateToken(updatedUser._id),
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ message: 'Server Error' });
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