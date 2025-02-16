// mongoose.model
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const revenueSchema = new Schema({
  month: {
    type: String,
    required: true,
    unique: true,
    enum: [
      "January",
      "February",
      "March",
      "April",
      " May",
      "June",
      "July",
      "August",
      "September",
      "October ",
      "November",
      "December",
    ],
  },
  total_revenue: { type: Number, required: true },
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
});

module.exports = mongoose.model("Revenue", revenueSchema);
