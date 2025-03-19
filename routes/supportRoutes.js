const express = require('express')
const supportController = require('../controllers/SupportController')
const router = express.Router()
const verifyJWT = require('../middleware/verifyJWT')

router.use(verifyJWT);

router
    .post('/', supportController.sendUsMessage)
    .post('/admin', supportController.adminSendMessage)
    .get('/', supportController.getSupportMessages)
    .get('/admin-unread', supportController.countAdminUnread)
    .get('/messages/:role/:jabberId', supportController.getMyMessages)
    .get('/customer-unread/:jabberId', supportController.countCustomerUnread)
    .patch('/delete/message', supportController.deleteMessageById)




module.exports = router
