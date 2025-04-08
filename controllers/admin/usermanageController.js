const mongoose = require('mongoose');
const fs = require('fs')
const path = require('path')
const admin = require("../../model/adminSchema")
const User = require("../../model/userSchema")
const Category = require('../../model/categorySchema')
const bcrypt = require('bcrypt');
const product = require('../../model/productSchema');


const usermanagement = async (req, res) => {
    try {
       

        const page = parseInt(req.query.page) || 1;
        const itemsPerPage = 10;
        const searchQuery = req.query.search ? req.query.search.trim() : '';

        const searchCriteria = searchQuery
            ? {
                  $or: [
                      { name: { $regex: searchQuery, $options: 'i' } }, 
                      { email: { $regex: searchQuery, $options: 'i' } },
                      { phone: { $regex: searchQuery, $options: 'i' } },
                  ],
              }
            : {};

        const totalUsers = await User.countDocuments(searchCriteria);
        const totalPages = Math.ceil(totalUsers / itemsPerPage);

        const users = await User.find(searchCriteria)
            .skip((page - 1) * itemsPerPage)
            .limit(itemsPerPage);

        res.render('user_management', { 
            users, 
            currentPage: page,
            totalPages,
            searchQuery
        });
    } catch (error) {
        console.error('User management loading error:', error.message);
        res.redirect('/pageNotFound');
    }
};


const banUser = async (req, res) => {
    try {
        
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

        res.json({ success: true, message: 'User banned successfully', user });
    } catch (error) {
        console.error('Error banning user:', error.message);
        res.status(500).json({ success: false, message: 'An error occurred while banning the user' });
    }
};


const UnbanUser = async (req, res) => {
    try {
       
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

        res.json({ success: true, message: 'User Unbanned successfully', user });
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