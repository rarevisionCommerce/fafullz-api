const router = require("express").Router();
const botController = require("../controllers/botController");

router
  .post("/create-user", botController.createBotUser)
  .get("/bases", botController.getAllBases)
  .get("/ssns", botController.getSsns)
  .get("/wallet/:username", botController.getUserTransactions)
  .get("/get-currencies", botController.getAllCurrencies)
  .post("/checkout", botController.checkOutSSNByNumber)
  .post("/deposit", botController.createPayment);

module.exports = router;
