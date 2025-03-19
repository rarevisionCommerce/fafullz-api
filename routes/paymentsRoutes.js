const express = require('express');
const router = express.Router();
const paymentsController = require('../controllers/paymentsController');

router
    .post('/', paymentsController.getPaymentAdress)
    .post('/deposit', paymentsController.deposit)
    .post('/push/transaction', paymentsController.addPayment)
    .post('/refund/:userId', paymentsController.refund)
    .get('/payment-history/:userId',paymentsController.getUserPaymentsById)
    .get('/',paymentsController.getAllCharges)
    .patch('/deduct', paymentsController.deductPayment)
    .get('/nowpayments/get-currencies', paymentsController.getAllCurrencies)
    .post('/nowpayments/create-payment', paymentsController.createPaymentNowpayments)
    .post('/nowpayments/ipn-callback', paymentsController.IPNCallbackNowPayments)
    .get('/nowpayments/min-amount/:crypto', paymentsController.getMinimumAmount)

    



module.exports = router;
