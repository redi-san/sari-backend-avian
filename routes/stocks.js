const express = require("express");
//const upload = require("../middleware/upload");
const upload = require("../config/multer");
const { getStocks, getStocksByUser, createStock, updateStock, deleteStock } = require("../controllers/stocksController");

const router = express.Router();

router.get("/", getStocks);
router.get("/user/:firebase_uid", getStocksByUser);
router.post("/", upload.single("image"), createStock); 
router.put("/:id", upload.single("image"), updateStock);
router.delete("/:id", deleteStock);

module.exports = router;
