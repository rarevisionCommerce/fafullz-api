const express = require('express')
const router = express.Router()
const sellerController = require('../controllers/sellerController')
const verifyJWT = require('../middleware/verifyJWT')

router.use(verifyJWT);

router
    .get('/:sellerId', sellerController.getMyProductCount)
    .delete('/delete/:productId/:productType', sellerController.deleteProductById)
    .put('/all/:sellerId', sellerController.updateIspaidStatusToAllSellersProducts)
    .put('/one/:productId/:productType', sellerController.updateOneProductToIsPaid)
    .put('/suspend/:sellerId', sellerController.suspendSellerProducts)
    .put('/un-suspend/:sellerId', sellerController.unSuspendSellerProducts)


module.exports = router