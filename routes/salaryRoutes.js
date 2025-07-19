const express = require('express');
const { calculateMarketingSalary, getAllMarketingStaff, addUserSalary, searchUserSalaryDetails,updateStaffSalary } = require('../controllers/SalaryController');
const router = express.Router();

router.post('/calculate-salary',calculateMarketingSalary);
router.post('/marketing-staff',getAllMarketingStaff);
router.post('/addUserSalary', addUserSalary);
router.post('/searchUserSalaryDetails', searchUserSalaryDetails);
router.post('/updateStaffSalary', updateStaffSalary);


module.exports = router;


