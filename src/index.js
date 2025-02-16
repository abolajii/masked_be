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

app.get("/api/v1/status", (req, res) => {
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
  console.log(users);

  console.log("All data deleted");
};

// AllUsers();

// const adminId = "67b176cbcb9b7bbc365dd48b";
// const innocenctId = "67b176b37754b28a1c8730e8";

// localUpdateCapital();

// createDailySignalForUser(innocenctId);

// deleteAllUsers();
// localGetSignalsForTheDay();

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

// createUser(d1);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = (req, res) => app(req, res);
