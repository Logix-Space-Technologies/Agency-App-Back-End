const express = require('express');
const { calculateMarketingSalary, getAllMarketingStaff } = require('../controllers/SalaryController');
const router = express.Router();

router.post('/calculate-salary',calculateMarketingSalary);
router.post('/marketing-staff',getAllMarketingStaff);


module.exports = router;


