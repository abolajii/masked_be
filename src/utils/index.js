const moment = require("moment");
const User = require("../model/User");
const Signal = require("../model/Signal");

exports.isWithinTradingWindow = (currentTime) => {
  const hour = currentTime.hour();
  const minute = currentTime.minute();
  const timeInMinutes = hour * 60 + minute;

  // Check 14:00-14:40 window
  const afternoonStart = 14 * 60; // 14:00
  const afternoonEnd = 14 * 60 + 40; // 14:40

  // Check 19:00-19:30 window
  const eveningStart = 19 * 60; // 19:00
  const eveningEnd = 19 * 60 + 40; // 19:40

  return (
    (timeInMinutes >= afternoonStart && timeInMinutes <= afternoonEnd) ||
    (timeInMinutes >= eveningStart && timeInMinutes <= eveningEnd)
  );
};

exports.getTimeWindowString = (currentTime) => {
  const hour = currentTime.hour();

  if (hour === 14) {
    return `${currentTime.format("YYYY-MM-DD")} 14:00 - 14:30`;
  } else if (hour === 19) {
    return `${currentTime.format("YYYY-MM-DD")} 19:00 - 19:30`;
  }
  return null;
};

// Your existing helper functions remain the same
exports.calculateProfit = (recentCapital) => {
  const balanceBeforeTrade = recentCapital;
  const tradingCapital = recentCapital * 0.01;
  const profitFromTrade = tradingCapital * 0.88;
  const balanceAfterTrade = balanceBeforeTrade + profitFromTrade;

  return {
    balanceBeforeTrade,
    tradingCapital,
    profitFromTrade,
    balanceAfterTrade,
  };
};

exports.checkIfTodayIsSunday = (date) => {
  const today = moment(date);
  return today.day() === 0;
};

exports.updateMissedSignals = async () => {
  try {
    console.log("Starting missed signals update process...");

    // Get current date
    const now = new Date();
    const currentDateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD

    // Find all signals that are "not-started" and have dates in the past
    const missedSignals = await Signal.find({
      status: "not-started",
      traded: false,
      $or: [
        // Find signals where startingCapital > 0 (they were initialized but not processed)
        { startingCapital: { $gt: 0 } },
        // Find signals that have a date-time string earlier than now
        { time: { $regex: /^\d{4}-\d{2}-\d{2}/ } },
      ],
    });

    console.log(`Found ${missedSignals.length} missed signals to process`);

    if (!missedSignals || missedSignals.length === 0) {
      return {
        success: true,
        message: "No missed signals found to process",
        processed: 0,
      };
    }

    // Group signals by user
    const userSignals = {};
    for (const signal of missedSignals) {
      const userId = signal.user.toString();
      if (!userSignals[userId]) {
        userSignals[userId] = [];
      }
      userSignals[userId].push(signal);
    }

    // Process signals for each user in chronological order
    const results = {
      success: true,
      processed: 0,
      errors: [],
      userResults: {},
    };

    for (const userId in userSignals) {
      // Get user data
      const user = await User.findById(userId);
      if (!user) {
        results.errors.push(`User not found: ${userId}`);
        continue;
      }

      // Sort signals by time (chronologically)
      const userSignalsSorted = userSignals[userId].sort((a, b) => {
        const dateA = new Date(a.time.split(" ")[0]);
        const dateB = new Date(b.time.split(" ")[0]);
        return dateA - dateB;
      });

      results.userResults[userId] = {
        username: user.username || user.email || userId,
        signalsProcessed: 0,
        capitalBefore: user.running_capital,
        capitalAfter: user.running_capital,
        details: [],
      };

      let currentCapital = user.running_capital;

      // Process each signal in order
      for (const signal of userSignalsSorted) {
        try {
          // Extract date from signal time
          const signalDate = signal.time.split(" ")[0];

          // Skip future signals
          if (signalDate > currentDateStr) {
            continue;
          }

          // Use the right starting capital
          // If signal.startingCapital is set and > 0, use that
          // Otherwise use the rolling capital from previous calculations
          const startingCapital =
            signal.startingCapital > 0
              ? signal.startingCapital
              : currentCapital;

          // Calculate profit
          const profitCalc = this.calculateProfit(startingCapital);

          // Update the signal
          signal.startingCapital = startingCapital;
          signal.finalCapital = profitCalc.balanceAfterTrade;
          signal.profit = profitCalc.profitFromTrade;
          signal.traded = true;
          signal.status = "completed";

          await signal.save();

          // Update our tracking of current capital
          currentCapital = profitCalc.balanceAfterTrade;

          // Track results
          results.processed++;
          results.userResults[userId].signalsProcessed++;
          results.userResults[userId].details.push({
            signalId: signal._id.toString(),
            time: signal.time,
            capitalBefore: startingCapital,
            capitalAfter: profitCalc.balanceAfterTrade,
            profit: profitCalc.profitFromTrade,
          });
        } catch (err) {
          results.errors.push(
            `Error processing signal ${signal._id}: ${err.message}`
          );
        }
      }

      // Update user's running capital to match the final calculation
      if (results.userResults[userId].signalsProcessed > 0) {
        user.running_capital = currentCapital;
        await user.save();

        results.userResults[userId].capitalAfter = currentCapital;
      }
    }

    console.log(`Processed ${results.processed} missed signals`);

    return results;
  } catch (error) {
    console.error("Error updating missed signals:", error);
    return {
      success: false,
      error: error.message,
      processed: 0,
    };
  }
};
