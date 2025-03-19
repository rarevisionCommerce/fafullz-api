const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const verifyJWT = require('../middleware/verifyJWT')

router.use(verifyJWT);

router
    .post('/', cartController.addToCart)
    .get('/:userId', cartController.getCartByUserId)
    .delete('/:userId/product/:productId', cartController.deleteProductFromCart)
    .delete('/products/:userId', cartController.deleteCartProducts)


module.exports = router;