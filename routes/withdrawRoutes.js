const express = require("express");
const router = express.Router();
const withdrawRequestController = require("../controllers/withdrawRequestController");
const verifyJWT = require("../middleware/verifyJWT");

router.use(verifyJWT);

router
  .post("/", withdrawRequestController.createWithdrawRequest)
  .get("/", withdrawRequestController.getWithdrawRequests)
  .get("/one/:userId", withdrawRequestController.getMyWithdrawRequests)
  .get("/unread", withdrawRequestController.countUnreadRequests)
 

module.exports = router;
