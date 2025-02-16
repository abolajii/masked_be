const moment = require("moment");

exports.isWithinTradingWindow = (currentTime) => {
  const hour = currentTime.hour();
  const minute = currentTime.minute();
  const timeInMinutes = hour * 60 + minute;

  // Check 14:00-14:40 window
  const afternoonStart = 14 * 60; // 14:00
  const afternoonEnd = 14 * 60 + 30; // 14:40

  // Check 19:00-19:30 window
  const eveningStart = 19 * 60; // 19:00
  const eveningEnd = 19 * 60 + 30; // 19:30

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

exports.checkIfTodayIsSunday = () => {
  const today = moment();
  return today.day() === 0;
};
