const express = require('express');
const router = express.Router();
const dumpController = require('../controllers/dumpController');
const verifyJWT = require('../middleware/verifyJWT')

router.use(verifyJWT);


router
    .post('/', dumpController.createDump)
    .get('/', dumpController.getAllDumps)
    .get('/all/:sellerId', dumpController.getAllDumpsBySellerId)

    



module.exports = router;