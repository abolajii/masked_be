// DepositModel.js
// depositAmount, depositDate,whenDeposited

const mongoose = require("mongoose");

const withdrawSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  date: {
    type: Date,
    required: true,
  },
  whenWithdraw: {
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

const Withdraw = mongoose.model("Withdraw", withdrawSchema);
module.exports = Withdraw;
