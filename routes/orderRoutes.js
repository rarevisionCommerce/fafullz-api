const express = require('express')
const router = express.Router()
const orderController = require('../controllers/orderController')
const verifyJWT = require('../middleware/verifyJWT')

router.use(verifyJWT);

router
    .post('/:userId', orderController.checkoutProducts)
    .get('/:userId', orderController.getMyOrders)


module.exports = router