const User = require("../model/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.logIn = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, error: "Incorrect password" });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || "your_secret_key",
      {
        expiresIn: "1h",
      }
    );

    res.json({ success: true, token, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

const moment = require("moment");
const Signal = require("../model/Signal");

// Helper function to check if today is Sunday
const checkIfTodayIsSunday = () => {
  return moment().day() === 0; // 0 represents Sunday
};

// Helper function to get last Saturday's date
const getLastSaturdayDate = () => {
  const today = moment();
  // If today is Sunday, get yesterday's date, otherwise get last Saturday
  if (today.day() === 0) {
    return today.subtract(1, "days").format("YYYY-MM-DD");
  }
  return today.day(-1).format("YYYY-MM-DD"); // -1 gets last Saturday
};

exports.getCurrentUser = async (req, res) => {
  try {
    let user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const isSunday = checkIfTodayIsSunday();

    if (isSunday) {
      // Get last Saturday's date
      const lastSaturday = getLastSaturdayDate();

      console.log(lastSaturday);

      // Find the last completed signal from Saturday
      const lastSignal = await Signal.findOne({
        user: req.user.id,
        time: {
          $regex: `^${lastSaturday}`, // Match signals from last Saturday
        },
        status: "completed",
      }).sort({ time: -1 }); // Get the latest signal from that day

      if (
        lastSignal &&
        lastSignal.finalCapital &&
        lastSignal.finalCapital < user.weekly_capital
      ) {
        // Update user's running capital with Saturday's final capital
        user = await User.findByIdAndUpdate(
          req.user.id,
          {
            $set: { weekly_capital: lastSignal.finalCapital },
          },
          { new: true }
        );

        console.log(
          `Updated Sunday's capital based on Saturday's final signal: ${lastSignal.finalCapital}`
        );
      } else {
        console.log("No completed signals found from last Saturday");
      }
    }

    res.json({
      success: true,
      user,
      isSunday,
    });
  } catch (error) {
    console.error("Error in getCurrentUser:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

// Optional: Helper function to get all signals from last Saturday
exports.getLastSaturdaySignals = async (userId) => {
  const lastSaturday = getLastSaturdayDate();

  return await Signal.find({
    user: userId,
    time: {
      $regex: `^${lastSaturday}`,
    },
    status: "completed",
  }).sort({ time: -1 });
};
exports.logOut = async (req, res) => {};

exports.register = async (req, res) => {};

exports.forgotPassword = async (req, res) => {};

exports.resetPassword = async (req, res) => {};

exports.verifyEmail = async (req, res) => {};

exports.resendVerificationEmail = async (req, res) => {};

exports.changePassword = async (req, res) => {};

exports.updateProfile = async (req, res) => {};

exports.getProfile = async (req, res) => {};
