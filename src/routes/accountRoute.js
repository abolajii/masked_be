const { updateCapital } = require("../controller/accountController");
const { verifyToken } = require("../middleware");

const router = require("express").Router();

router.get("/update-capital", [verifyToken], updateCapital);

module.exports = router;
