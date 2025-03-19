const express = require('express');
const router = express.Router();
const productPriceController = require('../controllers/productPricesController');

router
    .post('/', productPriceController.setProductPrice)
    .get('/one/:productType', productPriceController.getProductPrice)
    .get('/', productPriceController.getAllProductPrices)


module.exports = router