// mongoose.model
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const signalSchema = new Schema({
  startingCapital: {
    type: Number,
    required: true,
  },
  finalCapital: {
    type: Number,
    required: true,
  },
  time: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  traded: {
    type: Boolean,
    default: false,
  },
  profit: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ["not-started", "inprogress", "completed"],
    default: "active",
  },
});

module.exports = mongoose.model("Signal", signalSchema);
