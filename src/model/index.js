require("dotenv").config();

const mongoose = require("mongoose");
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;

module.exports = db;
/**
 * Handles MongoDB connection errors.
 *
 * This function is a callback function that is executed when an error occurs during the connection to MongoDB.
 * It logs the error message to the console.
 *
 * @param {Error} error - The error object that contains the details of the error.
 * @returns {void}
 */
db.on("error", (error) => console.error(error));
