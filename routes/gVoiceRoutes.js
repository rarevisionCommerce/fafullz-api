const express = require('express')
const router = express.Router()
const gvoiceController = require('../controllers/gvoiceController')

router
    .post('/', gvoiceController.createGvoice)
    .get('/', gvoiceController.getAllGvoice)
    .get('/all/:sellerId', gvoiceController.getAllGvoiceBySellerId)



module.exports = router