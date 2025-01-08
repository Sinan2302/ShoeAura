const mongoose = require('mongoose');
const fs = require('fs')
const path = require('path')
const admin = require("../../model/adminSchema")
const User = require("../../model/userSchema")
const Category = require('../../model/categorySchema')
const bcrypt = require('bcrypt');
const product = require('../../model/productSchema');



const categorymanagement = async(req,res)=>{
    try {
        const isLogin = req.session.isAdminLoggedIn ? true : false;

        if (!isLogin) {
            return res.redirect('/admin/adminlogin'); 
        }

        const page = parseInt(req.query.page) || 1;
        const itemsPerPage = 5; 

        const categories = await Category.find().skip((page - 1) * itemsPerPage) .limit(itemsPerPage);  


        const totalPages = Math.ceil(itemsPerPage);

        res.render('category_management',{ categories, isLogin , currentPage: page,totalPages,})
    } catch (error) {
        console.error('categorymanagement loading error:', error.message);
        res.redirect('/pageNotFound');   
     }
}



const blocked_category = async(req,res)=>{
    try {
        const isLogin = req.session.isAdminLoggedIn ? true : false;

        if (!isLogin) {
            return res.redirect('/admin/adminlogin'); 
        }
        const categoryData = req.params.categoryId;
        const productData = await product.findOne()

        const categoryId = await Category.findByIdAndUpdate(
            categoryData,
            { isBlocked: true },
            { new: true }
        );

        if (!categoryId) {
            return res.status(404).json({ success: false, message: 'category not found' });
        }

        const updatedProducts = await product.updateMany(
            { category: categoryData },
            { isBlocked: true }
        );


        res.json({ success: true, message: 'category blocked successfully', categoryId , updatedProducts ,isLogin});
    } catch (error) {
        console.error('Error blocking user:', error.message);
        res.status(500).json({ success: false, message: 'An error occurred while blocking the category' });
    }
    
}



const Unblocked_category = async(req,res)=>{
    try {
        const isLogin = req.session.isAdminLoggedIn ? true : false;

        if (!isLogin) {
            return res.redirect('/admin/adminlogin'); 
        }
        const categoryData = req.params.categoryId;

        const categoryId = await Category.findByIdAndUpdate(
            categoryData,
            { isBlocked: false },
            { new: true }
        );

        if (!categoryId) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }
        const updatedProducts = await product.updateMany(
            { category: categoryData },
            { isBlocked: false }
        );
        res.json({ success: true, message: 'Category Unblocked successfully', categoryId ,updatedProducts ,isLogin});
    } catch (error) {
        console.error('Error Unblocking user:', error.message);
        res.status(500).json({ success: false, message: 'An error occurred while Unblocking the category' });
    }
    
}



const loadaddcategory = async(req,res)=>{
    try {
        const isLogin = req.session.isAdminLoggedIn ? true : false;

        if (!isLogin) {
            return res.redirect('/admin/adminlogin'); 
        }
        res.render('addcategory',{isLogin})
    } catch (error) {
        console.error("Error loading",error)
    }
}



const addcategory = async (req, res) => {
    try {
        const isLogin = req.session.isAdminLoggedIn ? true : false;

        if (!isLogin) {
            return res.redirect('/admin/adminlogin'); 
        }
        const { categoryname, description, categoryOffer = 0 } = req.body;

        
        if (!categoryname || !description) {
            return res.status(400).json({ success: false, message: "Category name and description are required." });
        }

        const FindCategory = await Category.findOne({ categoryname });
        if(FindCategory){
            res.redirect('/admin/addcategory',{message:"Category already exist"})
        }

        const newCategory = new Category({
            categoryname,
            description,
            categoryOffer
        });

        await newCategory.save();
        console.log(newCategory)
        res.json({success : true , message :"Category Added Successfully" , isLogin})
    } catch (error) {
        console.error("Error Occured", error);
        res.json({ success: false, message: "Error Occured" });
    }
};

const loadUpdateCategory =  async (req, res)=>{
    try {
        const isLogin = req.session.isAdminLoggedIn ? true : false;

        if (!isLogin) {
            return res.redirect('/admin/adminlogin'); 
        }
        const { id } = req.params;

        const categoryData = await Category.findById(id); 
        res.render('categoryUpdate', { categoryData, isLogin });
    } catch (error) {
        console.error("Error loading UpdateCategory page")
        res.json({success: false , message :"Error loading UpdateCategory page"})
    }
}


const updateCategory = async (req,res)=>{
    try {
        const isLogin = req.session.isAdminLoggedIn ? true : false;

        if (!isLogin) {
            return res.redirect('/admin/adminlogin'); 
        }
        const { id } = req.params;
        const { categoryname, description, categoryOffer } = req.body;

        const updateCategory = await Category.findByIdAndUpdate(id,{
            categoryname, 
            description, 
            categoryOffer
        },{new:true})

        res.status(200).json({success:true , message:"Category Successfully Updated", updateCategory ,isLogin})
    } catch (error) {
        console.error("Error Occured during update");
        res.status(500).json({success:false , message:"Error Occured during update"})

    }
}


module.exports={
    categorymanagement,
    loadaddcategory,
    addcategory,
    blocked_category,
    Unblocked_category,
    loadUpdateCategory,
    updateCategory,
}