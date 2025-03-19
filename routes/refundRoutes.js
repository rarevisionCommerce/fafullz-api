const express = require("express");
const router = express.Router();
const refundController = require("../controllers/refundController");
const verifyJWT = require("../middleware/verifyJWT");

// router.use(verifyJWT);

router
  .post("/", refundController.addRefund)
  .post("/process", refundController.processRefund)
  .get("/", refundController.getAllRefunds)
  .get("/count", refundController.countUnreadRefunds)
  .get("/:refundId", refundController.getOneRefund)
  .get("/product/:productType/:productId", refundController.getOneProduct);

module.exports = router;
