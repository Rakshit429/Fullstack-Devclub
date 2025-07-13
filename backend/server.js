// backend/server.js

require('dotenv').config();
const connectDB = require('./config/db');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const multer = require('multer');
const authRoutes = require('./routes/authRoutes');
const callRoutes = require('./routes/callRoutes');
const admin = require('firebase-admin');

// --- FIREBASE ADMIN INITIALIZATION ---
let serviceAccount;
if (process.env.NODE_ENV === 'production') {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        throw new Error('The FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set.');
    }
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
} else {
    serviceAccount = require('./config/firebase-service-account-key.json');
}
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL
});

// --- DATABASE & APP INITIALIZATION ---
connectDB();
const app = express();

// --- CORE MIDDLEWARE ---

// **FIX 1: Dynamic CORS Policy**
// In production, the frontend and backend are on the same origin, but this is more robust.
// It allows your localhost and your future deployed frontend to make requests.
const whitelist = ['http://localhost:3000', 'https://fullstack-devclub.onrender.com']; // <-- Replace with your actual Render URL
const corsOptions = {
  origin: function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};
app.use(cors(corsOptions));


app.use(express.json());
app.use(cookieParser());

// --- UPLOAD HANDLING ---
// Serve the 'uploads' folder statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'image/gif') {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type!'), false);
  }
};

const upload = multer({ storage, limits: { fileSize: 1024 * 1024 * 5 }, fileFilter });

// --- API ROUTES ---
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded.');
  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.status(200).json({ filePath: fileUrl });
});

app.use('/api/auth', authRoutes);
app.use('/api/calls', callRoutes);

// --- **FIX 2: Production Static File Serving** ---
// This entire block should only run in the production environment on Render.
if (process.env.NODE_ENV === 'production') {
  // 1. Point to the build folder of the frontend
  const buildPath = path.join(__dirname, '..', 'frontend', 'build');
  app.use(express.static(buildPath));

  // 2. For any route that is not an API route, send the index.html file.
  // This must be the LAST route defined.
  app.get('/*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

// --- SERVER LISTENER ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Backend server is running on port: ${PORT}`);
});