require("dotenv").config();
const jwt = require("jsonwebtoken");
const User = require("../model/User");

exports.verifyToken = async (req, res, next) => {
  try {
    const token = req.headers["authorization"].split(" ")[1];
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your_secret_key"
    );
    const user = await User.findOne({ _id: decoded.id });
    if (!user) {
      return res.status(401).json({ success: false, error: "User not found" });
    }

    const userData = {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
    };

    req.user = userData;

    next();
  } catch (error) {
    console.error(error);
    return res.status(401).json({ success: false, error: "Invalid token" });
  }
};
