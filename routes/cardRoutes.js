const express = require('express')
const router = express.Router()
const cardController = require('../controllers/cardController')
const verifyJWT = require('../middleware/verifyJWT')

router.use(verifyJWT);

router
    .post('/', cardController.createCard)
    .get('/', cardController.getAllCards)
    .get('/all/:sellerId', cardController.getAllCardsBySellerId)


module.exports = router