const express = require('express');
const router = express.Router();
const { getUsers, loginUser,deleteUser,searchUser,addUser} = require('../controllers/userController');

router.post('/', getUsers);
router.post('/add', addUser);
router.post('/search', searchUser);
router.post('/delete', deleteUser);
router.post('/login', loginUser);

module.exports = router;