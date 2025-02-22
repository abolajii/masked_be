const {
  updateCapital,
  getAllDeposits,
  deleteDeposit,
  addDeposit,
  getSignalsForTheDay,
  getTotalProfitFromSignal,
  getRevenue,
} = require("../controller/accountController");
const { verifyToken } = require("../middleware");

const router = require("express").Router();

router.get("/update-capital", [verifyToken], updateCapital);

router.get("/signal", [verifyToken], getSignalsForTheDay);

router.get("/signal/stats", [verifyToken], getTotalProfitFromSignal);

router.get("/deposits", [verifyToken], getAllDeposits);

router.get("/revenue", [verifyToken], getRevenue);

router.post("/add/deposit", [verifyToken], addDeposit);

router.delete("/delete/deposit/:id", [verifyToken], deleteDeposit);

module.exports = router;
