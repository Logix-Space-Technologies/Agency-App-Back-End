const express = require('express');
const router = express.Router();
const { getCustomers, editUser, getUsers, loginUser, deleteUser, searchUser, addUser, getUserByID, getMenuItems, updateUserAccess, changePassword, toggleBlock, getLinksForUser} = require('../controllers/userController');

router.post('/', getUsers);
router.post('/add', addUser);
router.post('/search', searchUser);
router.post('/delete', deleteUser);
router.post('/login', loginUser);
router.post('/editUser', editUser);
router.post('/getCustomers', getCustomers);
router.post('/userByID', getUserByID);
router.post('/menu', getMenuItems);
router.post('/accessEdit', updateUserAccess);
router.post('/changePassword', changePassword);
router.post('/toggleBlock', toggleBlock);
router.post('/userLinks', getLinksForUser);

module.exports = router;