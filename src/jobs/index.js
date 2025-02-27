const Signal = require("../model/Signal");
const moment = require("moment");
const User = require("../model/User"); // Assuming there's a User model
const { updateSignalForUser, updateCapitalForUser } = require("../helpers");

const calculateProfit = (recentCapital) => {
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

/**
 * Updates signals for all users based on time windows
 */
const updateSignalsForAllUsers = async () => {
  try {
    const now = new Date();
    const formattedDate = now.toISOString().split("T")[0]; // Get current date YYYY-MM-DD

    // const allSignals = await Signal.find({});

    // console.log(allSignals);

    // Determine which time window we're in
    const currentHour = moment().hour();
    const isWithinMorningWindow = currentHour === 14;
    const isWithinEveningWindow = currentHour === 19;

    // Skip if we're not in either time window
    if (!isWithinMorningWindow && !isWithinEveningWindow) {
      console.log("Not within scheduled signal window, skipping update");
      return;
    }

    // Determine the current time window for the signal
    const timeZone = isWithinMorningWindow
      ? `${moment().format("YYYY-MM-DD")} 14:00 - 14:30`
      : `${moment().format("YYYY-MM-DD")} 19:00 - 19:30`;

    console.log(`Processing signals for time window: ${timeZone}`);

    // Find signals that are "not-started" for the current time window
    const signals = await Signal.find({
      status: "not-started",
      time: timeZone,
    });

    if (!signals || signals.length === 0) {
      console.log("No active signals found for current time window");
      return;
    }

    console.log(`Found ${signals.length} signals to process`);

    // Process each signal
    for (const signal of signals) {
      // Get the user associated with this signal
      const user = await User.findById(signal.user);

      if (!user) {
        console.log(`User not found for signal ${signal._id}`);
        continue;
      }

      // Calculate profit for this user
      const profitCalculation = calculateProfit(user.running_capital);

      // Update signal first
      const updatedSignal = await updateSignalForUser(user._id, {
        signalId: signal._id,
        status: "completed",
        traded: true,
        startingCapital: user.running_capital,
        finalCapital: profitCalculation.balanceAfterTrade,
        profit: profitCalculation.profitFromTrade,
      });

      if (!updatedSignal.success) {
        console.error(
          `Failed to update signal for user ${user._id}: ${updatedSignal.error}`
        );
        continue;
      }

      // Then update user's capital
      const updatedCapital = await updateCapitalForUser(user._id, {
        running_capital: parseFloat(profitCalculation.balanceAfterTrade),
      });

      if (!updatedCapital.success) {
        console.error(
          `Failed to update capital for user ${user._id}: ${updatedCapital.error}`
        );
      } else {
        console.log(`Successfully processed signal for user ${user._id}`);
      }
    }

    console.log("Finished processing all signals");
  } catch (error) {
    console.error("Error updating signals:", error);
  }
};

module.exports = updateSignalsForAllUsers;
