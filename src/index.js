const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();
const moment = require("moment");

const mongoose = require("mongoose");
const User = require("./model/User");
const Signal = require("./model/Signal");
const Deposit = require("./model/Deposit");
const Revenue = require("./model/Revenue");

const authRoute = require("./routes/authRoute");
const accountRoute = require("./routes/accountRoute");
const cors = require("cors");

const updateSignalsForAllUsers = require("./jobs");
const Withdraw = require("./model/Withdraw");
const { updateMissedSignals, calculateProfit } = require("./utils");

const {
  TradingSchedule,
  calculateDayProfits,
} = require("./utils/tradingUtils");
const { updateSignalForUser, updateCapitalForUser } = require("./helpers");
const app = express();

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174"],
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  socket.on("validateUsers", async (users) => {
    // Process each user sequentially and emit results in real-time
    for (const user of users) {
      // Emit validation result for each user immediately
      socket.emit("userValidated", {});
    }
  });
});

app.use(cors());

app.use(express.json());

app.use("/api/v1", authRoute);
app.use("/api/v1", accountRoute);

// ✅ Define the cron job route
app.get("/api/cron", (req, res) => {
  console.log("Cron job triggered at:", new Date().toLocaleString());
  runCronJob();
  res.json({ message: "Cron job executed successfully!" });
});

const getAllDeposits = async () => {
  const deposits = await Deposit.find({});
  console.log(deposits);

  for (const deposit of deposits) {
    const depositDate = new Date(deposit.date).toISOString().split("T")[0];

    const depositFirstSignal = await Signal.find({
      time: `${depositDate} 14:00 - 14:30`,
    });

    const depositSecondSignal = await Signal.find({
      time: `${depositDate} 19:00 - 19:30`,
    });

    let capitalToUpdate = 0;

    // Determine which capital value to use based on whenDeposited
    if (deposit.whenDeposited === "before-trade") {
      // Find the first signal for this user
      const userFirstSignal = depositFirstSignal.find(
        (signal) => signal.user.toString() === deposit.user.toString()
      );

      if (userFirstSignal) {
        capitalToUpdate = userFirstSignal.startingCapital - deposit.amount;
      }
    } else if (deposit.whenDeposited === "inbetween-trade") {
      // Find the first signal for this user
      const userFirstSignal = depositFirstSignal.find(
        (signal) => signal.user.toString() === deposit.user.toString()
      );

      if (userFirstSignal) {
        capitalToUpdate = userFirstSignal.finalCapital - deposit.amount;
      }
    } else if (deposit.whenDeposited === "after-trade") {
      // Find the second signal for this user
      const userSecondSignal = depositSecondSignal.find(
        (signal) => signal.user.toString() === deposit.user.toString()
      );

      if (userSecondSignal) {
        capitalToUpdate = userSecondSignal.finalCapital - deposit.amount;
      }
    }

    // Update the deposit with the calculated capital
    if (capitalToUpdate > 0) {
      await Deposit.findByIdAndUpdate(
        deposit._id,
        { capital: capitalToUpdate },
        { new: true }
      );

      console.log(
        `Updated deposit ${deposit._id} with capital: ${capitalToUpdate}`
      );
    } else {
      console.log(`No matching signal found for deposit ${deposit._id}`);
    }
  }
};

// getAllDeposits();

// ✅ Example cron job function
async function runCronJob() {
  try {
    const currentHour = moment().hour();
    const isWithinMorningWindow = currentHour === 14;
    const isWithinEveningWindow = currentHour === 19;

    // Skip if we're not in either time window
    if (!isWithinMorningWindow && !isWithinEveningWindow) {
      console.log(
        "Not within scheduled signal window, skipping update",
        currentHour
      );
      // console.log
      return;
    }

    // Determine the current time window for the signal
    const timeZone = isWithinMorningWindow
      ? `${moment().format("YYYY-MM-DD")} 14:00 - 14:30`
      : `${moment().format("YYYY-MM-DD")} 19:00 - 19:30`;

    console.log(`Processing signals for time window: ${timeZone}`);

    const signals = await Signal.find({
      status: "not-started",
      // time: timeZone, // Uncomment if you want to filter by timeZone
    });

    console.log(`Found ${signals.length} signals to process`);

    for (const signal of signals) {
      const user = await User.findById(signal.user);
      if (!user) {
        console.log(`User not found for signal ${signal._id}`);
        continue;
      }

      const profitCalculation = calculateProfit(user.running_capital);
      console.log(`User: ${user._id}, Profit calculation:`, profitCalculation);

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

      // Get current month name for revenue tracking
      const month = moment().format("MMMM"); // This will give month names like January, February, etc.

      // Update revenue record for the current month
      await Revenue.findOneAndUpdate(
        { user: user._id, month },
        {
          total_revenue: parseFloat(profitCalculation.balanceAfterTrade),
        },
        { upsert: true } // Create if it doesn't exist
      );

      console.log(
        `Updated revenue record for user ${user._id} for month: ${month}`
      );
    }

    console.log("Finished processing all signals");
  } catch (error) {
    console.error("Error in runCronJob:", error);
  }
}

// const res = calculateProfit(443.08);
// console.log(res);

// runCronJob();

app.get("/", (req, res) => {
  res.json({ success: true, message: "Server is running" });
});

const d1 = {
  username: "admin",
  email: "admin@god.com",
  password: "Developer1!",
  role: "admin",
  starting_capital: 100,
  weekly_capital: 2258.23,
  running_capital: 2258.23,
};

const d2 = {
  username: "innocent",
  email: "innocent@god.com",
  password: "Innocent1!",
  role: "admin",
  starting_capital: 100,
  weekly_capital: 350.8,
  running_capital: 350.8,
};

const adminId = "67b1bc98d981de5d7bd00023";
const innocentId = "67b1bca8a00bacd62f1e30ed";

// findOneAndUpdate();
// const createRevenueForUsers = async () => {

//   try {
//     // First, drop the existing single-field index on month
//     await Revenue.collection.dropIndex("month_1");
//   } catch (error) {
//     // If the index doesn't exist, that's fine
//     console.log("No existing month index to drop");
//   }

//   try {
//     // Create the new compound index
//     await Revenue.collection.createIndex(
//       { month: 1, year: 1, user: 1 },
//       { unique: true }
//     );
//   } catch (error) {
//     console.log(
//       "Compound index already exists or error creating:",
//       error.message
//     );
//   }

//   const months = [
//     "January",
//     "February",
//     "March",
//     "April",
//     "May",
//     "June",
//     "July",
//     "August",
//     "September",
//     "October",
//     "November",
//     "December",
//   ];

//   const users = [adminId, innocentId];

//   for (const userId of users) {
//     for (const month of months) {
//       try {
//         // Check if record already exists using all three fields
//         const existingRecord = await Revenue.findOne({
//           month,
//           year: 2025,
//           user: userId,
//         });

//         if (!existingRecord) {
//           const revenue = await Revenue.create({
//             month,
//             year: 2025,
//             total_deposit: 0,
//             total_withdrawal: 0,
//             total_profit: 0,
//             total_revenue: 0,
//             user: userId,
//           });

//           console.log(`Revenue for ${month} 2025 created for user ${userId}`);
//         } else {
//           console.log(
//             `Revenue record for ${month} 2025 already exists for user ${userId}`
//           );
//         }
//       } catch (error) {
//         console.error(
//           `Error creating revenue for ${month} for user ${userId}:`,
//           error.message
//         );

//         // Log the full error object for debugging
//         console.error("Full error:", error);
//       }
//     }
//   }
// };

// Execute the function
// createRevenueForUsers()
//   .then(() => console.log("Finished creating revenue records"))
//   .catch((error) => console.error("Top level error:", error));

// // Execute the function
// // createRevenueForUsers().catch(console.error);

// createRevennueForUser(adminId);

const data = {
  // weekly_capital: {
  //   admin: 2549.97,
  //   innocent: 405.91,
  // },
  // weekly_capital: {
  //   admin: 3344.84,
  //   innocent: 667.32,
  // },
  // monthly_capital: {
  //   admin: 2664.97,
  //   innocent: 405.91,
  // },
  running_capital: {
    admin: calculateProfit(3344.84).balanceAfterTrade,
    innocent: calculateProfit(667.32).balanceAfterTrade,
  },

  // widthdraw: {
  //   admin: {
  //     amount: 700,
  //     date: "2025-03-09",
  //     whenWithdraw: "inbetween-trade",
  //   },
  // },
};

// const result = calculateDayProfits(data.running_capital.innocent);
// console.log(result);

// const adminId = "67b1bc98d981de5d7bd00023";
// const innocentId = "67b1bca8a00bacd62f1e30ed";

const updateUsers = async () => {
  //

  //

  const signals = await Signal.find({
    user: innocentId,
    time: `2025-03-02 14:00 - 14:30`,
  });

  signals.map(async (s) => {
    s.startingCapital = 667.32;
    s.finalCapital = calculateProfit(s.startingCapital).balanceAfterTrade;
    s.traded = true;
    s.profit = calculateProfit(s.startingCapital).profitFromTrade;
    s.status = "completed";

    await s.save();
  });

  // console.log(signals);

  await Revenue.findOneAndUpdate(
    // { user: adminId, month: "March" },
    {
      // total_revenue: data.running_capital.admin,
    }
  );

  await Revenue.findOneAndUpdate(
    // { user: innocentId, month: "March" },
    {
      // weekly_capital: data.weekly_capital.admin,
      //     // monthly_capital: data.monthly_capital.admin,
      // total_revenue: data.running_capital.innocent,
    }
  );

  // // Update admin
  await User.findByIdAndUpdate(adminId, {
    // weekly_capital: data.weekly_capital.admin,
    // monthly_capital: data.monthly_capital.admin,
    // running_capital: data.running_capital.admin,
  });

  // // Update innocent
  await User.findByIdAndUpdate(innocentId, {
    // weekly_capital: data.weekly_capital.innocent,
    // monthly_capital: data.monthly_capital.innocent,
    // running_capital: data.running_capital.innocent,
  });

  console.log("Users updated successfully");
};

// updateUsers();

// getRevenueForUser(adminId);

const getAllWithdraws = async () => {
  const withdrawals = await Withdraw.find({});

  console.log("All withdrawals:", withdrawals);
};

// getAllWithdraws();
// createWithdrawForUser(adminId);
// updateUsers();

// updateMissedSignals();

// const deleteWithdrawForUser = async (user, withdrawid) => {
//   try {
//     const withdraw = await Withdraw.findOneAndDelete({
//       amount: withdrawid,
//       user: user,
//     });

//     if (!withdraw) {
//       throw new Error("Withdrawal not found");
//     }

//     console.log(withdraw);

//     return {
//       success: true,
//       withdraw,
//     };
//   } catch (error) {
//     console.log(error);
//     return {
//       success: false,
//       error: error.message,
//     };
//   }
// };

// const listUserProfit = async (user) => {
//   // Find all signals for this user with time greater than "2024-02-19 19:00 - 19:30"
//   const targetTimeString = "2025-02-19 14:00 - 14:30";

//   const signalProfit = await Signal.find({
//     user: adminId,
//     time: { $gt: targetTimeString },
//   });

//   // Calculate total profit
//   let totalProfit = 0;

//   if (signalProfit.length > 0) {
//     totalProfit = signalProfit.reduce((sum, signal) => {
//       return sum + (signal.profit || 0);
//     }, 0);
//   }

//   console.log({
//     totalProfit,
//     signalCount: signalProfit.length,
//     signals: signalProfit,
//   });

//   return {
//     user,
//     totalProfit,
//     signalCount: signalProfit.length,
//     signals: signalProfit,
//   };
// };

// listUserProfit();
// updateSignalsForAllUsers();

// const withdraws = [
//   {
//     dateOfWithdraw: "2025-03-05", // March 5th
//     amount: 200,
//     whenWithdrawHappened: "before-trade",
//   },
//   {
//     dateOfWithdraw: "2025-03-09", // March 15th
//     amount: 150,
//     whenWithdrawHappened: "inbetween-trade",
//   },
//   {
//     dateOfWithdraw: "2025-03-14", // March 25th
//     amount: 100,
//     whenWithdrawHappened: "after-trade",
//   },
// ];

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = (req, res) => app(req, res);
