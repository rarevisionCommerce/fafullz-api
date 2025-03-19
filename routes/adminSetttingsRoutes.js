const express = require('express')
const router = express.Router()
const adminSettingController = require('../controllers/adminSettingController')
const verifyJWT = require('../middleware/verifyJWT')

router.use(verifyJWT);

router
    .get('/', adminSettingController.getAdminSettings)
    .delete('/', adminSettingController.deleteAdminSettings)
    .post('/', adminSettingController.updateAdminSettings)
  


module.exports = router