require('dotenv').config();
const connectDB = require('./config/db');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path'); 
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const authRoutes = require('./routes/authRoutes');
const callRoutes = require('./routes/callRoutes');
// ---FIREBASE ADMIN INITIALIZATION ---
const admin = require('firebase-admin');
const serviceAccount = require('./config/firebase-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL 
});

connectDB();
const app = express();

app.use(cors({
  origin: 'http://localhost:3000', // The origin of your React app
  credentials: true, // This allows cookies to be sent and received
}));
app.use(express.json());
app.use(cookieParser());

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ... in server.js
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

// NEW: Add a file filter for security
const fileFilter = (req, file, cb) => {
  // Allow only common image types
  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'image/gif') {
    cb(null, true); // Accept the file
  } else {
    cb(new Error('Invalid file type, only JPEG, PNG, and GIF is allowed!'), false); // Reject the file
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 5 // Set a 5MB file size limit
  },
  fileFilter: fileFilter // Apply the filter
});

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }
  // Construct the URL of the uploaded file
  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.status(200).json({ filePath: fileUrl });
});

// const authLimiter = rateLimit({
//     windowMs: 60 * 60 * 1000, // 15 minutes
//     max: 100, // Limit each IP to 20 requests per window
//     standardHeaders: true,
//     legacyHeaders: false,
// });

app.use('/api/auth', authRoutes);
app.use('/api/calls', callRoutes);

if (process.env.NODE_ENV === 'production') {
  // 1. Set the build folder to be the static folder
  app.use(express.static(path.join(__dirname, 'client/build')));

  // 2. For any route that is not an API route, serve the index.html file
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
  });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Backend server is running on http://localhost:${PORT}`);
});