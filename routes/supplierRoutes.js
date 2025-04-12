const express = require('express');
const { viewAllSuppliers, addSuppliers, searchSuppliers, delSuppliers } = require('../controllers/supplierController');
const router = express.Router();


router.post('/',viewAllSuppliers);
router.post('/add',addSuppliers);
router.post('/search',searchSuppliers);
router.post('/del',delSuppliers);


module.exports = router;