const express = require('express')
const router = express.Router()
const productCategoryController = require('../controllers/productCategoryController')

router
    .get('/:productType', productCategoryController.getProductCategory)
    .post('/', productCategoryController.addProductCategory)
    .delete('/:productType/:category', productCategoryController.deleteProductCategory)
    


module.exports = router