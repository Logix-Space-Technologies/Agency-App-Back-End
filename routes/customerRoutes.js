const express = require('express');
const router = express.Router();
const { getCustomers, searchCustomer, getAllCustomers, deleteCustomer, editCustomer} = require('../controllers/customerController');

router.post('/search', searchCustomer);
router.post('/deleteCustomer', deleteCustomer);
router.post('/editCustomer', editCustomer);
router.post('/getCustomers', getCustomers);
router.post('/getAllCustomers', getAllCustomers);


module.exports = router;