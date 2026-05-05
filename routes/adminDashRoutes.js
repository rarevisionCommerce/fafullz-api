const express = require('express')
const router = express.Router()
const adminDashController = require('../controllers/adminDashController');
const verifyJWT = require('../middleware/verifyJWT')

router.use(verifyJWT);

router
    .get('/',  adminDashController.getADminDashData)
    .get('/stats', adminDashController.getDashStats)
    .get('/sales', adminDashController.getSalesData)
    .get('/profit', adminDashController.getProfitData)
    .post('/clear-profits', adminDashController.clearAllProfit)



module.exports = router