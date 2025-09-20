const express = require('express');
const router = express.Router();
const { getCustomers, editUser, getUsers, loginUser, deleteUser, searchUser, addUser, getMenuItems} = require('../controllers/userController');

router.post('/', getUsers);
router.post('/add', addUser);
router.post('/search', searchUser);
router.post('/delete', deleteUser);
router.post('/login', loginUser);
router.post('/editUser', editUser);
router.post('/getCustomers', getCustomers);
router.post('/menu', getMenuItems);

module.exports = router;