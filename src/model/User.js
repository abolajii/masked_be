// mongoose.model
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["user", "admin"], default: "user" },
  avatar: { type: String },
  created_at: { type: Date, default: Date.now },
  last_login: { type: Date },
  starting_capital: { type: Number, required: true },
  weekly_capital: { type: Number, required: true },
  monthly_capital: { type: Number },
  running_capital: { type: Number, required: true },
});

module.exports = mongoose.model("User", userSchema);
