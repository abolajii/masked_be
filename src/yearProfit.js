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

const getNumberOfDaysToYearEnd = (date) => {
  const today = new Date(date);
  const yearEnd = new Date(today.getFullYear(), 11, 31);
  return Math.ceil((yearEnd - today) / (1000 * 3600 * 24));
};

const getStartingCapitalForPresentDay = (capital, numberOfSignal) => {
  if (numberOfSignal === 0) {
    let result = calculateProfit(capital);
    result = calculateProfit(result.balanceAfterTrade);
    return result.balanceAfterTrade;
  }

  if (numberOfSignal === 1) {
    const result = calculateProfit(capital);
    return result.balanceAfterTrade;
  }

  return capital;
};

const getProfitAfterWithdraw = (
  capital,
  numberOfSignal,
  withdraws,
  deposits = []
) => {
  let today = new Date();
  let numberOfDaysToYearEnd = getNumberOfDaysToYearEnd(today);
  let currentCapital = getStartingCapitalForPresentDay(capital, numberOfSignal);

  if (numberOfSignal === 2) {
    numberOfDaysToYearEnd -= 1;
  }

  console.log(`Starting Capital: ${currentCapital.toFixed(2)}`);

  for (let i = 0; i < numberOfDaysToYearEnd; i++) {
    let currentDate = new Date();
    currentDate.setDate(today.getDate() + i); // Simulating day iteration

    let withdraw = withdraws.find(
      (w) => new Date(w.date).toDateString() === currentDate.toDateString()
    );

    let deposit = deposits.find(
      (d) => new Date(d.date).toDateString() === currentDate.toDateString()
    );

    let result = calculateProfit(currentCapital);
    let logMessage = `Day ${i + 1} (${currentDate.toDateString()}): `;

    // Handle deposits first
    if (deposit) {
      logMessage += `DEPOSIT ${deposit.amount} at ${deposit.whenDeposited} - `;

      if (deposit.whenDeposited === "before-trade") {
        currentCapital += deposit.amount;
        // Recalculate result with new capital
        result = calculateProfit(currentCapital);
      } else if (deposit.whenDeposited === "inbetween-trade") {
        currentCapital = result.balanceAfterTrade + deposit.amount;
      } else if (deposit.whenDeposited === "after-trade") {
        let secondTrade = calculateProfit(result.balanceAfterTrade);
        currentCapital = secondTrade.balanceAfterTrade + deposit.amount;
      }
    }

    // Handle withdrawals
    if (withdraw) {
      logMessage += `WITHDRAW ${withdraw.amount} at ${withdraw.whenWithdraw} - `;

      if (withdraw.whenWithdraw === "before-trade") {
        currentCapital -= withdraw.amount;
        // Recalculate result with new capital
        result = calculateProfit(currentCapital);
      } else if (withdraw.whenWithdraw === "inbetween-trade") {
        currentCapital = result.balanceAfterTrade - withdraw.amount;
      } else if (withdraw.whenWithdraw === "after-trade") {
        let secondTrade = calculateProfit(result.balanceAfterTrade);
        currentCapital = secondTrade.balanceAfterTrade - withdraw.amount;
      }
    }

    // If no deposit or withdrawal occurred on this day
    if (!withdraw && !deposit) {
      result = calculateProfit(result.balanceAfterTrade);
      currentCapital = result.balanceAfterTrade;
    }

    logMessage += `Capital After Trades: ${currentCapital.toFixed(2)}`;
    console.log(logMessage);
  }

  console.log(`Final Capital after Withdrawal: ${currentCapital.toFixed(2)}`);
  return currentCapital;
};

// Example Usage:
const withdraws = [
  {
    amount: 700,
    date: "2025-03-15T00:00:00.000Z",
    whenWithdraw: "inbetween-trade", // "before-trade" | "inbetween-trade" | "after-trade"
  },
];

const deposits = [
  {
    amount: 5555,
    date: "2025-02-19",
    whenDeposited: "inbetween-trade", // "before-trade" | "inbetween-trade" | "after-trade"
  },
];

getProfitAfterWithdraw(2905.29, 0, withdraws, deposits);

const calculateProfitv2 = (recentCapital) => {
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

const daysToReachProfit = (totalCapital, depositAmount) => {
  let days = 0;
  let currentCapital = totalCapital;
  let totalProfit = 0;

  while (totalProfit < depositAmount) {
    // Apply profit calculation twice per day
    for (let i = 0; i < 2; i++) {
      const { profitFromTrade, balanceAfterTrade } =
        calculateProfitv2(currentCapital);
      totalProfit += profitFromTrade;
      currentCapital = balanceAfterTrade;
    }
    days++;
  }

  return days;
};

// Example usage:
const totalCapital = 2687.61; // Total amount after deposit
const depositAmount = 555; // Profit target (equal to deposit)
console.log(
  `It will take ${daysToReachProfit(
    totalCapital,
    depositAmount
  )} days to make a profit of ${depositAmount}.`
);
