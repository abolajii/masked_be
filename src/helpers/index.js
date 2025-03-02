const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Signal = require("../model/Signal");
const User = require("../model/User");
const Revenue = require("../model/Revenue");
const Deposit = require("../model/Deposit");
const Withdraw = require("../model/Withdraw");

// Create a new user
const createUser = async ({
  username,
  email,
  password,
  starting_capital,
  weekly_capital,
  running_capital,
}) => {
  try {
    // Hash password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      starting_capital, // Initialize with zero
      weekly_capital,
      running_capital,
    });

    const savedUser = await newUser.save();

    console.log(savedUser);
    return {
      success: true,
      user: savedUser,
    };
  } catch (error) {
    console.log(error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Create daily signals for a user
const createDailySignalForUser = async (user) => {
  try {
    // First fetch the user to get the capital
    const userCapital = await User.findById(user);
    if (!userCapital) {
      throw new Error("User not found");
    }

    // Get today's date in ISO format (YYYY-MM-DD)
    const today = new Date().toISOString().split("T")[0];

    // Check if user has any signals for today
    const existingSignals = await Signal.findOne({
      user,
      time: new RegExp(today, "i"), // Case insensitive search for today's date
    });

    if (existingSignals) {
      return {
        success: false,
        error: "User already has signals for today",
      };
    }

    const signals = [
      {
        title: "Signal 1",
        time: `${today} 14:00 - 14:30`,
        traded: false,
        status: "not-started",
        startingCapital: parseFloat(userCapital.running_capital) || 0,
        finalCapital: 0,
        user,
      },
      {
        title: "Signal 2",
        time: `${today} 19:00 - 19:30`,
        traded: false,
        status: "not-started",
        startingCapital: 0,
        finalCapital: 0,
        user,
      },
    ];

    const createdSignals = await Signal.insertMany(signals);

    console.log(createdSignals);

    return {
      success: true,
      signals: createdSignals,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

// Create or update monthly revenue for a user
const createRevenueForUser = async (user) => {
  try {
    const currentDate = new Date();
    const currentMonth = currentDate.toLocaleString("default", {
      month: "long",
    });

    // Calculate total profit from all completed signals for the month
    const monthlySignals = await Signal.find({
      user: user,
      status: "completed",
      time: new RegExp(currentMonth, "i"),
    });

    const totalRevenue = monthlySignals.reduce(
      (sum, signal) => sum + signal.profit,
      0
    );

    // Upsert revenue document for the month
    const revenue = await Revenue.findOneAndUpdate(
      {
        month: currentMonth,
        user: user,
      },
      {
        total_revenue: totalRevenue,
        user: user,
      },
      {
        upsert: true,
        new: true,
      }
    );

    return {
      success: true,
      revenue,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

// Update user's capital
const updateCapitalForUser = async (
  user,
  { starting_capital, weekly_capital, running_capital }
) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(
      user,
      {
        $set: {
          starting_capital,
          weekly_capital,
          running_capital,
        },
      },
      { new: true }
    );

    return {
      success: true,
      user: updatedUser,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

// Update signal status and related data
const updateSignalForUser = async (
  user,
  { signalId, status, traded, finalCapital, startingCapital, profit }
) => {
  try {
    const signal = await Signal.findOne({ _id: signalId, user: user });

    if (!signal) {
      throw new Error("Signal not found");
    }

    const updatedSignal = await Signal.findByIdAndUpdate(
      signalId,
      {
        $set: {
          status: status || signal.status,
          traded: traded ?? signal.traded,
          startingCapital,
          finalCapital,
          profit,
        },
      },
      { new: true }
    );

    // Update user's running capital if signal is completed
    if (status === "completed" && finalCapital) {
      await updateCapitalForUser(user, {
        running_capital: finalCapital,
      });
    }

    // Update monthly revenue if signal is completed
    if (status === "completed") {
      await createRevenueForUser(user);
    }

    return {
      success: true,
      signal: updatedSignal,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

const createDepositForUser = async (
  user,
  { amount, date, bonus, whenDeposited, capital }
) => {
  try {
    const deposit = new Deposit({
      user,
      amount,
      bonus,
      whenDeposited,
      date,
      capital,
    });

    await deposit.save();

    return {
      success: true,
      deposit,
    };
  } catch (error) {
    console.log(error);
    return {
      success: false,
      error: error.message,
    };
  }
};

const deleteDepositForUser = async (user, signalId) => {
  try {
    const deposit = await Deposit.findOneAndDelete({
      _id: signalId,
      user: user,
    });

    if (!deposit) {
      throw new Error("Deposit not found");
    }

    const userD = await User.findById(user);

    userD.running_capital -= deposit.amount;
    await userD.save();

    console.log(deposit);

    return {
      success: true,
      deposit,
    };
  } catch (error) {
    console.log(error);
    return {
      success: false,
      error: error.message,
    };
  }
};

const getRevenueForUser = async (user) => {
  try {
    const revenues = await Revenue.find({ user });

    if (!revenues) {
      return res
        .status(404)
        .json({ success: false, message: "No revenues found" });
    }

    // res.json({ success: true, data: revenues });
  } catch (error) {
    console.error("Error fetching revenues:", error.message);
    // res.status(500).json({ success: false, message: "Server error" });
  }
};

const createWithdrawForUser = async (user, { amount, date, whenWithdraw }) => {
  try {
    const withdraw = new Withdraw({
      user,
      amount,
      whenWithdraw,
      date,
    });

    await withdraw.save();

    return {
      success: true,
      withdraw,
    };
  } catch (error) {
    console.log(error);
    return {
      success: false,
      error: error.message,
    };
  }
};

const deleteWithdrawForUser = async (user, withdrawid) => {
  try {
    const withdraw = await Withdraw.findOneAndDelete({
      _id: withdrawid,
      user: user,
    });

    if (!withdraw) {
      throw new Error("Withdrawal not found");
    }

    console.log(withdraw);

    return {
      success: true,
      withdraw,
    };
  } catch (error) {
    console.log(error);
    return {
      success: false,
      error: error.message,
    };
  }
};

module.exports = {
  createUser,
  createDailySignalForUser,
  createRevenueForUser,
  updateCapitalForUser,
  updateSignalForUser,
  createDepositForUser,
  deleteDepositForUser,
  getRevenueForUser,
  createWithdrawForUser,
  deleteWithdrawForUser,
};
