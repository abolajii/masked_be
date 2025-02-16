const router = require("express").Router();
const { logIn, getCurrentUser } = require("../controller/authController");
const { verifyToken } = require("../middleware");

router.post("/login", logIn);
router.get("/me", [verifyToken], getCurrentUser);

module.exports = router;
