const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();
const cron = require("node-cron");

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
const { updateMissedSignals } = require("./utils");
const {
  TradingSchedule,
  calculateDayProfits,
} = require("./utils/tradingUtils");
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
  // monthly_capital: {
  //   admin: 2664.97,
  //   innocent: 405.91,
  // },
  running_capital: {
    admin: 2854.82,
    innocent: 435.51,
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

  await Revenue.findOneAndUpdate(
    { user: adminId, month: "February" },
    {
      // weekly_capital: data.weekly_capital.admin,
      // monthly_capital: data.monthly_capital.admin,
      total_revenue: data.running_capital.admin,
    }
  );

  await Revenue.findOneAndUpdate(
    { user: innocentId, month: "February" },
    {
      // weekly_capital: data.weekly_capital.admin,
      // monthly_capital: data.monthly_capital.admin,
      total_revenue: data.running_capital.innocent,
    }
  );

  // Update admin
  await User.findByIdAndUpdate(adminId, {
    // weekly_capital: data.weekly_capital.admin,
    // monthly_capital: data.monthly_capital.admin,
    running_capital: data.running_capital.admin,
  });

  // Update innocent
  await User.findByIdAndUpdate(innocentId, {
    // weekly_capital: data.weekly_capital.innocent,
    // monthly_capital: data.monthly_capital.innocent,
    running_capital: data.running_capital.innocent,
  });

  console.log("Users updated successfully");
};

// updateUsers();3

// getRevenueForUser(adminId);

const getAllWithdraws = async () => {
  const withdrawals = await Withdraw.find({});

  console.log("All withdrawals:", withdrawals);
};

// getAllWithdraws();
// createWithdrawForUser(adminId);

// updateMissedSignals();

const deleteWithdrawForUser = async (user, withdrawid) => {
  try {
    const withdraw = await Withdraw.findOneAndDelete({
      amount: withdrawid,
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

// deleteWithdrawForUser(adminId, 89);

cron.schedule("35 14,19 * * *", updateSignalsForAllUsers);
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
