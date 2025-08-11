const express = require('express');
const { viewAllSuppliers, getAllSuppliers, addSuppliers, searchSuppliers, deleteSuppliers, editSupplier } = require('../controllers/supplierController');
const router = express.Router();


router.post('/', viewAllSuppliers);
router.post('/view', getAllSuppliers);
router.post('/add',addSuppliers);
router.post('/search',searchSuppliers);
router.post('/delete', deleteSuppliers);
router.post('/edit', editSupplier);


module.exports = router;