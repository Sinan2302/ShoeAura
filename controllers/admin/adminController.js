const mongoose = require('mongoose');
const fs = require('fs')
const path = require('path')
const admin = require("../../model/adminSchema")
const User = require("../../model/userSchema")
const Category = require('../../model/categorySchema')
const bcrypt = require('bcrypt');
const product = require('../../model/productSchema');




const loadLogin = async(req,res)=>{
    try {
        const isLogin = req.session.isAdminLoggedIn ? true : false;
        if (isLogin) {
            return res.redirect('/admin/dashboard'); 
        }
        console.log(req.session.isAdminLoggedIn)
        res.render('login')
        
    } catch (error) {
        res.redirect('/pageNotFound')
    }
   
}
const loadDashboard = async (req, res) => {
    try {
        const isLogin = req.session.isAdminLoggedIn ? true : false;

        if (!isLogin) {
            return res.redirect('/admin/adminlogin'); 
        }
        res.render('dashboard', { isLogin });
    } catch (error) {
        console.error('Dashboard loading error:', error.message);
        res.redirect('/pageNotFound');
    }
};


const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        const adminData = await admin.findOne({ username });
        if (!adminData) {
            return res.render('login', { message: 'User not found' });
        }

        const match = await bcrypt.compare(password, adminData.password);
        if (!match) {
            return res.render('login', { message: 'Invalid password' });
        }

        req.session.isAdminLoggedIn = adminData;
        console.log(req.session.isAdminLoggedIn)

        const users = await User.find({});
        res.render('dashboard', { isLogin: true, adminUsername: username, users });
        console.log("login successfully")
        
    } catch (error) {
        console.error('Error during login:', error.message);
        res.render('login', { message: 'Something went wrong' });
    }
};


const logout = async (req,res)=>{
    try {
        req.session.destroy((error)=>{
            if (error) {
                console.error("Error destroying session", error);
                return res.status(500).send("Failed to logout");
            }

            res.clearCookie(process.env.SESSION_SECRET); 
            res.status(200).redirect('/admin/dashboard'); 
            console.log("logout Successfull")
        })
    } catch (error) {
        console.error("error occured during logout")
        res.json({success:false,message:"Error Occured"})
    }
}

module.exports = {
    loadLogin,
    loadDashboard,
    login,
    logout
}