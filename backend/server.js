require('dotenv').config();
const User = require('./models/user');
const connectDB = require('./config/db');
const { protect } = require('./middleware/authMiddleware');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken'); 
const Joi = require('joi');
const router = express.Router();

connectDB();


const app = express();

app.use(cors());
app.use(express.json());


const userschema = Joi.object({
    username: Joi.string()
        .required(),

    password: Joi.string()
        .pattern(new RegExp('^[a-zA-Z0-9]{3,30}$'))
        .required(),

    email: Joi.string()
        .email({ minDomainSegments: 2})
        .required(),
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

app.post('/api/auth/register',async (req,res)=>{
  try{
    const { error } = userschema.validate(req.body);
    if (error) {
        return res.status(400).send(error.details[0].message);
    }

    const { username, email, password } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }
    const usernameExists = await User.findOne({ username });
    if (usernameExists) {
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
    }
  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).json({ message: 'Server Error' });
  }
})

app.post('/api/auth/login', async (req, res) => {
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

app.get('/api/auth/profile', protect, (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized, no user found' });
  }
  res.status(200).json(req.user);
});

app.put('/api/auth/profile', protect, async (req,res)=>{
  try {
    const user = req.user;
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
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Server Error' });
  }
})

app.delete('/api/auth/profile',(req,res)=>{
})

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Backend server is running on http://localhost:${PORT}`);
});