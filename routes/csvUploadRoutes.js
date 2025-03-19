const express = require('express');
const router = express.Router();
const csvUploadController = require('../controllers/csvUploadController');
const {upload} = require('../helpers/fileHelper');



router
    .post('/ssn',upload.single('file'), csvUploadController.uploadSsn)
    .post('/card',upload.single('file'), csvUploadController.uploadCard)
    .post('/mail',upload.single('file'), csvUploadController.uploadMail)
    

module.exports = router
