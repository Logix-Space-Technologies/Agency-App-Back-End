const express = require('express');
const router = express.Router();
const { editUser, getUsers, loginUser,deleteUser,searchUser,addUser} = require('../controllers/userController');

router.post('/', getUsers);
router.post('/add', addUser);
router.post('/search', searchUser);
router.post('/delete', deleteUser);
router.post('/login', loginUser);
router.post('/editUser', editUser);

module.exports = router;