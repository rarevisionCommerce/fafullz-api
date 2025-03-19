const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const {upload} = require('../helpers/fileHelper');



router
    .post('/', upload.single('file'), fileController.uploadFile)
    .get('/', fileController.getAllFiles)
    .get('/all/:sellerId', fileController.getAllFilesBySellerId)

    



module.exports = router;