// DepositModel.js
// depositAmount, depositDate,whenDeposited

const mongoose = require("mongoose");

const depositSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  date: {
    type: Date,
    required: true,
  },
  capital: {
    type: Number,
    required: true,
    default: 0,
  },
  bonus: {
    type: Number,
    default: 0,
  },
  whenDeposited: {
    type: String,
    required: true,
    enum: ["before-trade", "inbetween-trade", "after-trade"],
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
});

const Deposit = mongoose.model("Deposit", depositSchema);
module.exports = Deposit;
