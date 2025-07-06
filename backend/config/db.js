const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

const connectDB = async () => {
  try {
    // Attempt to connect to the MongoDB cluster
    const conn = await mongoose.connect(process.env.MONGO_URI);

    // If connection is successful, log it to the console
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    // If there's an error, log the error message and exit the process
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1); // Exit process with failure code 1
  }
};

module.exports = connectDB;