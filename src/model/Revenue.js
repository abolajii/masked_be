const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const revenueSchema = new Schema({
  month: {
    type: String,
    required: true,
  },
  year: {
    type: Number,
    required: true,
  },
  total_deposit: {
    type: Number,
    required: true,
    default: 0,
  },
  total_withdrawal: {
    type: Number,
    required: true,
    default: 0,
  },
  total_profit: {
    type: Number,
    required: true,
    default: 0,
  },
  total_revenue: {
    type: Number,
    required: true,
    default: 0,
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
});

// Add compound index for uniqueness
revenueSchema.index({ month: 1, year: 1, user: 1 }, { unique: true });

module.exports = mongoose.model("Revenue", revenueSchema);
