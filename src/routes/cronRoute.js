const express = require("express");
const router = express.Router();

router.get("/cron", (req, res) => {
  console.log("Cron job triggered:", new Date().toLocaleString());
  myScheduledTask();
  res.json({ message: "Cron job ran successfully!" });
});

function myScheduledTask() {
  console.log("Running scheduled task at:", new Date().toLocaleString());
  // Your cron job logic here
}

export default router;
