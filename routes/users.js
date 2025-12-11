const express = require("express");
const {
  registerUser,
  getUser,
  updateUser,
  getUserByUsername
} = require("../controllers/usersController");

const router = express.Router();

router.post("/", registerUser);
router.get("/:uid", getUser);
router.put("/:uid", updateUser);
router.get("/username/:username", getUserByUsername);

module.exports = router;
