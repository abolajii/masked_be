const {
  updateCapital,
  getAllDeposits,
  deleteDeposit,
  addDeposit,
  getSignalsForTheDay,
} = require("../controller/accountController");
const { verifyToken } = require("../middleware");

const router = require("express").Router();

router.get("/update-capital", [verifyToken], updateCapital);

router.get("/signal", [verifyToken], getSignalsForTheDay);

router.get("/deposits", [verifyToken], getAllDeposits);

router.post("/add/deposit", [verifyToken], addDeposit);

router.delete("/delete/deposit/:id", [verifyToken], deleteDeposit);

module.exports = router;
