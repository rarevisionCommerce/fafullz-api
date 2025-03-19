const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');
const {upload} = require('../helpers/fileHelper');


router
    .post('/', upload.single('file'), accountController.uploadAccount)
    .get('/', accountController.getAllAccounts)
    .get('/all/:sellerId', accountController.getAllAccountsBySellerId)
    



module.exports = router;