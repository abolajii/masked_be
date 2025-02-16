const {
  createDepositForUser,
  updateCapitalForUser,
  updateSignalForUser,
} = require("../helpers");
const Signal = require("../model/Signal");
const moment = require("moment");

const User = require("../model/User");
const {
  calculateProfit,
  getTimeWindowString,
  isWithinTradingWindow,
  checkIfTodayIsSunday,
} = require("../utils");

const adminId = "67b0ebbe3bd7d7fcd07451ac";
const innocenctId = "67b0ebf99545c7d910a4dfe8";

exports.updateCapital = async (req, res) => {
  try {
    const { id } = req.user;
    const currentTime = moment();

    // Check if current time falls within trading windows
    const isValidTradingTime = isWithinTradingWindow(currentTime);
    if (!isValidTradingTime) {
      return res.status(400).json({
        success: false,
        error: "Trading is only allowed between 14:00-14:40 and 19:00-19:30",
      });
    }

    // Get the appropriate time window for signal
    const timeWindow = getTimeWindowString(currentTime);

    // Find active signal for current time window
    const activeSignal = await Signal.findOne({
      user: id,
      time: timeWindow,
      status: "not-started",
    });

    if (!activeSignal) {
      return res.status(404).json({
        success: false,
        error: "No active signal found for current time window",
      });
    }

    const loggedInUser = await User.findOne({ _id: id });
    const profitCalculation = await calculateProfit(
      loggedInUser.running_capital
    );

    // Update signal first
    const updatedSignal = await updateSignalForUser(id, {
      signalId: activeSignal._id,
      status: "completed",
      traded: true,
      startingCapital: loggedInUser.running_capital,
      finalCapital: profitCalculation.balanceAfterTrade,
      profit: profitCalculation.profitFromTrade,
    });

    if (!updatedSignal.success) {
      return res.status(500).json({
        success: false,
        error: updatedSignal.error,
      });
    }

    // Then update user's capital
    const updatedCapital = await updateCapitalForUser(id, {
      running_capital: parseFloat(profitCalculation.balanceAfterTrade),
    });

    if (!updatedCapital.success) {
      return res.status(500).json({
        success: false,
        error: updatedCapital.error,
      });
    }

    res.json({
      success: true,
      user: updatedCapital.user,
      signal: updatedSignal.signal,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

// Testing configuration object
let testConfig = {
  isTestMode: false,
  testTime: null,
};

// Function to enable test mode and set custom time
const enableTestMode = (timeString) => {
  testConfig.isTestMode = true;
  testConfig.testTime = moment(timeString);
  console.log(
    `Test mode enabled. Current test time: ${testConfig.testTime.format(
      "YYYY-MM-DD HH:mm:ss"
    )}`
  );
};

// enableTestMode("2025-02-15 14:30:00");

// Function to disable test mode
exports.disableTestMode = () => {
  testConfig.isTestMode = false;
  testConfig.testTime = null;
  console.log("Test mode disabled. Using real time.");
};

// Function to adjust test time
exports.adjustTestTime = (amount, unit) => {
  if (!testConfig.isTestMode) {
    console.log("Please enable test mode first");
    return;
  }
  testConfig.testTime.add(amount, unit);
  console.log(
    `Test time adjusted to: ${testConfig.testTime.format(
      "YYYY-MM-DD HH:mm:ss"
    )}`
  );
};

exports.localUpdateCapital = async () => {
  try {
    const loggedInUser = await User.findOne({ _id: adminId });

    // Use test time if in test mode, otherwise use current time
    const currentTime = testConfig.isTestMode ? testConfig.testTime : moment();

    console.log(
      `Current ${testConfig.isTestMode ? "test" : "real"} time:`,
      currentTime.format("YYYY-MM-DD HH:mm:ss")
    );

    // Check if current time falls within trading windows
    const isValidTradingTime = isWithinTradingWindow(currentTime);

    if (!isValidTradingTime) {
      console.log("Trading is not allowed for this time");
      return;
    }

    // Get the appropriate time window for signal
    const timeWindow = getTimeWindowString(currentTime);

    // Find active signal for current time window
    const activeSignal = await Signal.findOne({
      user: adminId,
      time: timeWindow,
      status: "not-started",
    });

    if (!activeSignal) {
      console.log("No active signal found for current time window");
      return;
    }

    const profitCalculation = await calculateProfit(
      loggedInUser.running_capital
    );

    // Update signal first
    const updatedSignal = await updateSignalForUser(adminId, {
      signalId: activeSignal._id,
      status: "completed",
      traded: true,
      startingCapital: loggedInUser.running_capital,
      finalCapital: profitCalculation.balanceAfterTrade,
    });

    if (!updatedSignal.success) {
      console.error("Failed to update signal status");
      return;
    }

    // Then update user's capital
    const updatedCapital = await updateCapitalForUser(adminId, {
      running_capital: parseFloat(profitCalculation.balanceAfterTrade),
    });

    if (!updatedCapital.success) {
      console.error("Failed to update user's capital");
      return;
    }

    console.log("Capital updated successfully");
  } catch (error) {
    console.error(error);
  }
};

// Helper function to check current test time
exports.getCurrentTestTime = () => {
  if (!testConfig.isTestMode) {
    console.log("Test mode is not enabled");
    return null;
  }
  return testConfig.testTime.format("YYYY-MM-DD HH:mm:ss");
};

exports.updateSignalStatus = async (req, res) => {};

exports.getSignalsForTheDay = async (req, res) => {
  try {
    const { id } = req.user;
    const today = new Date().toISOString().split("T")[0];

    const user = await User.findOne({ _id: id });

    const signals = await Signal.find({
      user,
      time: new RegExp(today, "i"), // Case insensitive search for today's date
    }).sort({ time: 1 });

    res.json({ success: true, signals });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

exports.localGetSignalsForTheDay = async () => {
  try {
    const today = new Date().toISOString().split("T")[0];

    const user = adminId;

    const isSunday = checkIfTodayIsSunday();

    const signals = await Signal.find({
      user,
      time: new RegExp(today, "i"), // Case insensitive search for today's date
    }).sort({ time: 1 });

    console.log(signals, isSunday);

    // res.json({ success: true, signals });
  } catch (error) {
    console.error(error);
    // res.status(500).json({ success: false, error: "Internal server error" });
  }
};

exports.addDeposit = async (req, res) => {
  try {
    const user = adminId;
    const { amount, date, bonus, whenDeposited } = req.body;

    if (!user || !amount) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
    }

    const deposit = await createDepositForUser(user, {
      amount,
      date,
      bonus,
      whenDeposited,
    });

    if (!deposit.success) {
      return res.status(500).json({
        success: false,
        error: deposit.error,
      });
    }

    res.json({ success: true, deposit });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};
