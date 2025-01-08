const mongoose = require('mongoose');
const fs = require('fs')
const path = require('path')
const admin = require("../../model/adminSchema")
const User = require("../../model/userSchema")
const Category = require('../../model/categorySchema')
const bcrypt = require('bcrypt');
const product = require('../../model/productSchema');


const usermanagement = async (req, res)=>{
    try {
        const isLogin = req.session.isAdminLoggedIn ? true : false;

        if (!isLogin) {
            return res.redirect('/admin/adminlogin'); 
        }
        const users = await User.find({});
        res.render('user_management', { users , isLogin });
    } catch (error) {
        console.error('usermanagement loading error:', error.message);
        res.redirect('/pageNotFound');
    
    }
}

const banUser = async (req, res) => {
    try {
        const isLogin = req.session.isAdminLoggedIn ? true : false;

        if (!isLogin) {
            return res.redirect('/admin/adminlogin'); 
        }
        const userId = req.params.userId;

        
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: 'Invalid User ID' });
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { isBlocked: true },
            { new: true }
        ); 

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({ success: true, message: 'User banned successfully', user ,isLogin});
    } catch (error) {
        console.error('Error banning user:', error.message);
        res.status(500).json({ success: false, message: 'An error occurred while banning the user' });
    }
};


const UnbanUser = async (req, res) => {
    try {
        const isLogin = req.session.isAdminLoggedIn ? true : false;

        if (!isLogin) {
            return res.redirect('/admin/adminlogin'); 
        }
        const userId = req.params.userId;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: 'Invalid User ID' });
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { isBlocked: false },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({ success: true, message: 'User Unbanned successfully', user ,isLogin});
    } catch (error) {
        console.error('Error Unbanning user:', error.message);
        res.status(500).json({ success: false, message: 'An error occurred while banning the user' });
    }
};



module.exports = {
    usermanagement,
    banUser,
    UnbanUser,
}