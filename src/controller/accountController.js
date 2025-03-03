const {
  createDepositForUser,
  updateCapitalForUser,
  updateSignalForUser,
  createDailySignalForUser,
  createWithdrawForUser,
  deleteWithdrawForUser,
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
const Deposit = require("../model/Deposit");
const Revenue = require("../model/Revenue");
const Withdraw = require("../model/Withdraw");

const adminId = "67b1bc98d981de5d7bd00023";
const innocenctId = "67b1bca8a00bacd62f1e30ed";

exports.updateCapital = async (req, res) => {
  try {
    const { id } = req.user;
    const currentTime = moment();

    // Define the trading windows
    const morningWindow = {
      start: moment().set({ hour: 14, minute: 30 }),
      end: moment().set({ hour: 19, minute: 0 }),
    };

    const eveningWindow = {
      start: moment().set({ hour: 19, minute: 30 }),
      end: moment().set({ hour: 23, minute: 0 }),
    };

    // Check if current time is within either trading window
    const isWithinMorningWindow = currentTime.isBetween(
      morningWindow.start,
      morningWindow.end,
      "minute",
      "[]"
    );
    const isWithinEveningWindow = currentTime.isBetween(
      eveningWindow.start,
      eveningWindow.end,
      "minute",
      "[]"
    );

    if (!isWithinMorningWindow && !isWithinEveningWindow) {
      return res.status(400).json({
        success: false,
        error:
          "Trading can only be done during designated time windows (14:00-14:30 or 19:00-19:30)",
      });
    }

    // Determine the current time window for the signal
    const timeZone = isWithinMorningWindow
      ? `${moment().format("YYYY-MM-DD")} 14:00 - 14:30`
      : `${moment().format("YYYY-MM-DD")} 19:00 - 19:30`;

    // Find active signal for current time window
    const activeSignal = await Signal.findOne({
      user: id,
      time: timeZone,
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

exports.getRevenue = async (req, res) => {
  const user = req.user.id;
  try {
    const revenues = await Revenue.find({ user });

    if (!revenues) {
      return res
        .status(404)
        .json({ success: false, message: "No revenues found" });
    }

    res.json({ success: true, data: revenues });
  } catch (error) {
    console.error("Error fetching revenues:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
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

    console.log(timeWindow);

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

    console.log(updatedCapital, updatedSignal);

    // console.log("Capital updated successfully");
  } catch (error) {
    console.error(error);
  }
};

exports.updateSignalStatus = async (req, res) => {};

exports.getSignalsForTheDay = async (req, res) => {
  try {
    const { id } = req.user;
    const today = new Date().toISOString().split("T")[0];

    const user = await User.findOne({ _id: id });

    let signals;

    signals = await Signal.find({
      user,
      time: new RegExp(today, "i"), // Case insensitive search for today's date
    }).sort({ time: 1 });

    if (signals.length === 0) {
      const result = await createDailySignalForUser(user);
      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: result.error,
        });
      }

      signals = result.signals;
    }

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

    const signals = await Signal.find({
      user,
      time: new RegExp(today, "i"), // Case insensitive search for today's date
    }).sort({ time: 1 });

    // res.json({ success: true, signals });
  } catch (error) {
    console.error(error);
    // res.status(500).json({ success: false, error: "Internal server error" });
  }
};

exports.addDeposit = async (req, res) => {
  try {
    const user = req.user.id;
    const { amount, date, bonus, tradeTime } = req.body;
    const loggedInuser = await User.findById(req.user.id);

    if (!user || !amount) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
    }

    const deposit = await createDepositForUser(user, {
      capital: loggedInuser.running_capital,
      amount,
      date,
      bonus,
      whenDeposited: tradeTime,
    });

    if (!deposit.success) {
      return res.status(500).json({
        success: false,
        error: deposit.error,
      });
    }

    if (!deposit.success) {
      console.error("Failed to add deposit");
      return;
    }

    const logged = await User.findOne({ _id: user });

    if (tradeTime === "before-trade") {
      if (checkIfTodayIsSunday()) {
        logged.weekly_capital += Number(amount);
      }
    }

    // logged.running_capital += Number(amount);

    // await logged.save();

    // console.log(logged, amount);

    res.json({ success: true, deposit });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error });
  }
};

exports.localAddDeposit = async ({
  amount,
  date,
  bonus,
  whenDeposited,
  user,
}) => {
  console.log({
    amount,
    date,
    bonus,
    whenDeposited,
    user,
  });
  try {
    const deposit = await createDepositForUser(user, {
      amount,
      date,
      bonus,
      whenDeposited,
    });

    if (!deposit.success) {
      console.error("Failed to add deposit");
      return;
    }

    const logged = await User.findOne({ _id: user });

    if (whenDeposited === "before-trade") {
      if (checkIfTodayIsSunday(date)) {
        logged.weekly_capital += amount;
      }
    }

    logged.running_capital += amount;

    await logged.save();

    console.log("Deposit added successfully");
  } catch (error) {
    console.error(error);
  }
};

exports.getAllDeposits = async (req, res) => {
  try {
    const user = req.user.id;

    const deposits = await Deposit.find({ user }).sort({ date: -1 });

    res.json({ success: true, deposits });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

exports.getAllWithdraws = async (req, res) => {
  try {
    const user = req.user.id;

    const withdraw = await Withdraw.find({ user }).sort({ date: -1 });

    res.json({ success: true, withdraw });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

exports.createWithdraw = async (req, res) => {
  const user = req.user.id;
  const { amount, date, whenWithdraw } = req.body;

  if (!user || !amount) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields",
    });
  }

  try {
    const withdraw = await createWithdrawForUser(user, {
      amount,
      date,
      whenWithdraw,
    });

    if (!withdraw.success) {
      return res.status(500).json({
        success: false,
        error: withdraw.error,
      });
    }

    // const logged = await User.findOne({ _id: user });

    if (whenWithdraw === "before-trade") {
      // if (checkIfTodayIsSunday()) {
      //   logged.weekly_capital -= amount;
      // }
    }

    // logged.running_capital -= amount;

    // await logged.save();

    res.json({ success: true, withdraw });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

exports.deletWithdraw = async (req, res) => {
  const id = req.params.id;
  const user = req.user.id;

  try {
    const withdraw = await deleteWithdrawForUser(user, id);

    if (!withdraw.success) {
      return res.status(500).json({
        success: false,
        error: withdraw.error,
      });
    }

    res.json({ success: true, message: "Withdrawal deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

exports.deleteDeposit = async (req, res) => {
  try {
    // Find the deposit first to get the amount
    const deposit = await Deposit.findById(req.params.id);

    if (!deposit) {
      return res.status(404).json({
        status: "fail",
        message: "Deposit not found.",
      });
    }

    // Remove the deposit amount from the user's starting capital
    const user = await User.findByIdAndUpdate(
      deposit.user,
      { $inc: { running_capital: -deposit.amount } }, // Subtract deposit amount
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        status: "fail",
        message: "User not found.",
      });
    }

    if (deposit.whenDeposited === "before-trade") {
      if (checkIfTodayIsSunday()) {
        user.weekly_capital -= deposit.amount;
      }
    }

    // Now delete the deposit record
    await Deposit.findByIdAndDelete(req.params.id);

    await user.save();

    res.status(200).json({
      status: "success",
      message: "Deposit deleted successfully.",
      data: { running_capital: user.running_capital }, // Return updated capital
    });
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};

exports.getTotalProfitFromSignal = async (req, res) => {
  // get total_profit, average_profit
  try {
    const user = req.user.id;
    const signals = await Signal.find({ user });

    const completed = signals.filter((signal) => signal.status === "completed");

    let totalProfit = 0;
    let averageProfit = 0;

    signals.forEach((signal) => {
      totalProfit += signal.profit;
    });

    averageProfit = totalProfit / completed.length;

    res.json({
      success: true,
      total_profit: totalProfit,
      average_profit: averageProfit,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};
