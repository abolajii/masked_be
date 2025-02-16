const {
  updateCapital,
  getAllDeposits,
} = require("../controller/accountController");
const { verifyToken } = require("../middleware");

const router = require("express").Router();

router.get("/update-capital", [verifyToken], updateCapital);

router.get("/deposits", [verifyToken], getAllDeposits);

module.exports = router;
