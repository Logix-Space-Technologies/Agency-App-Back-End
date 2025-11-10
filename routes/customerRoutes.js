const express = require('express');
const router = express.Router();
const { getCustomers, searchCustomer, getAllCustomers, deleteCustomer, editCustomer, fetchAllCustomers} = require('../controllers/customerController');

router.post('/search', searchCustomer);
router.post('/deleteCustomer', deleteCustomer);
router.post('/editCustomer', editCustomer);
router.post('/getCustomers', getCustomers);
router.post('/getAllCustomers', getAllCustomers);
router.post('/', fetchAllCustomers);


module.exports = router;