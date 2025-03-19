const express = require('express')
const mailController = require('../controllers/mailController')
const router = express.Router()
const verifyJWT = require('../middleware/verifyJWT')

router.use(verifyJWT);

router
    .post('/', mailController.createMail)
    .get('/', mailController.getAllMails)
    .get('/all/:sellerId', mailController.getAllMailsBySellerId)



module.exports = router