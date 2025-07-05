require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

// Use middleware
app.use(cors()); // This allows your React frontend to make requests to this backend
app.use(express.json());

// Define a simple API endpoint (a "route")
// When a GET request is made to http://localhost:5000/api/message, this function runs
app.get('/api/message', (req, res) => {
  // Send back a JSON object as the response
  res.json({ message: 'Hello from the backend! Your full-stack app is connected. and saying hello' });
});
app.get('/api/second-message', (req, res) => {
  // This is an additional endpoint for future use
  res.json({ message: 'hello This is a second message from the backend!' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Backend server is running on http://localhost:${PORT}`);
});