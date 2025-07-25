const express = require('express');
const router = express.Router();
const ssnController = require('../controllers/ssnController');
const verifyJWT = require('../middleware/verifyJWT')

router.use(verifyJWT);


router
    .post('/', ssnController.createSsnDob)
    .post('/update/seller', ssnController.updateSellerProductStatus)
    .get('/', ssnController.getAllSsns)
    .get('/all/:sellerId', ssnController.getAllSsnsBySellerId)

    



module.exports = router;