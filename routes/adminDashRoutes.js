const express = require('express')
const router = express.Router()
const adminDashController = require('../controllers/adminDashController');
const verifyJWT = require('../middleware/verifyJWT')

router.use(verifyJWT);

router
    .get('/',  adminDashController.getADminDashData)



module.exports = router