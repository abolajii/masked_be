const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const mongoose = require("mongoose");
// const { createUser, createDailySignalForUser } = require("./helpers");
const User = require("./model/User");
const Signal = require("./model/Signal");
const Deposit = require("./model/Deposit");
const Revenue = require("./model/Revenue");
// const {
//   localUpdateCapital,
//   localGetSignalsForTheDay,
// } = require("./controller/accountController");
const authRoute = require("./routes/authRoute");
const accountRoute = require("./routes/accountRoute");

const cors = require("cors");
const {
  localAddDeposit,
  localUpdateCapital,
} = require("./controller/accountController");
const { createUser } = require("./helpers");
const Withdraw = require("./model/Withdraw");
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

const deleteAllUsers = async () => {
  await User.deleteMany();
  await Signal.deleteMany();
  await Deposit.deleteMany();
  await Revenue.deleteMany();

  console.log("All data deleted");
};

const AllUsers = async () => {
  const users = await User.find();
  const signals = await Signal.find();

  // console.log(users);
  // console.log(signals);
};

// createDailySignalForUser(innocenctId);

// localGetSignalsForTheDay();

// localAddDeposit({
//   amount: 8.1089,
//   date: new Date(),
//   bonus: 0,
//   whenDeposited: "before-trade",
// });

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

// localAddDeposit({
//   amount: 8.1089,
//   date: new Date("2022-02-01"),
//   bonus: 0,
//   whenDeposited: "before-trade",
//   user: adminId,
// });

const findOneAndUpdate = async (id) => {
  const user = await Deposit.deleteMany({ user: adminId });
  console.log(user);
};

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
  //   admin: 2549.97,
  //   innocent: 405.91,
  // },
  // running_capital: {
  //   admin: 700.92,
  //   innocent: 420.39,
  // },

  widthdraw: {
    admin: {
      amount: 700,
      date: "2025-03-09",
      whenWithdraw: "inbetween-trade",
    },
  },
};

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

// updateUsers();

// getRevenueForUser(adminId);

const createWithdrawForUser = async (user) => {
  const withdrawal = await Withdraw.create({
    amount: data.widthdraw.admin.amount,
    date: new Date(data.widthdraw.admin.date),
    whenWithdraw: data.widthdraw.admin.whenWithdraw,
    user: user,
  });

  await withdrawal.save();

  console.log(`Withdrawal created for ${user}`, withdrawal);
};

const getAllWithdraws = async () => {
  const withdrawals = await Withdraw.find({});

  console.log("All withdrawals:", withdrawals);
};

getAllWithdraws();
// createWithdrawForUser(adminId);

//
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = (req, res) => app(req, res);
