const mongoose = require('mongoose');
const fs = require('fs')
const path = require('path')
const admin = require("../../model/adminSchema")
const User = require("../../model/userSchema")
const Category = require('../../model/categorySchema')
const bcrypt = require('bcrypt');
const product = require('../../model/productSchema');
const uploadProductImages = require('../../utils/cloudinary')



const categorymanagement = async(req, res) => {
    try {
       

        const page = parseInt(req.query.page) || 1;
        const itemsPerPage = 5;
        const searchQuery = req.query.search || '';

        const searchCriteria = searchQuery ? {
            $or: [
                { categoryname: { $regex: searchQuery, $options: 'i' } },
                { description: { $regex: searchQuery, $options: 'i' } },
            ],
        } : {};

        const totalCategories = await Category.countDocuments(searchCriteria);

        const categories = await Category.find(searchCriteria)
            .sort({createdAt:-1})
            .skip((page - 1) * itemsPerPage)
            .limit(itemsPerPage);

        const totalPages = Math.ceil(totalCategories / itemsPerPage);

        res.render('category_management', {
            categories,
            currentPage: page,
            totalPages,
            searchQuery, // Pass search query to the template
        });
    } catch (error) {
        console.error('categorymanagement loading error:', error.message);
        res.redirect('/pageNotFound');   
    }
};




const blocked_category = async(req,res)=>{
    try {
       
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


        res.json({ success: true, message: 'category blocked successfully', categoryId , updatedProducts });
    } catch (error) {
        console.error('Error blocking user:', error.message);
        res.status(500).json({ success: false, message: 'An error occurred while blocking the category' });
    }
    
}



const Unblocked_category = async(req,res)=>{
    try {
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

        res.json({ success: true, message: 'Category Unblocked successfully', categoryId ,updatedProducts });

    } catch (error) {
        console.error('Error Unblocking user:', error.message);
        res.status(500).json({ success: false, message: 'An error occurred while Unblocking the category' });
    }
    
}



const loadaddcategory = async(req,res)=>{
    try {
        res.render('addcategory')
    } catch (error) {
        console.error("Error loading",error)
    }
}

const addcategory = async (req, res) => {
  try {

    let { categoryname, description, categoryOffer = 0 } = req.body;

    if (!categoryname || !description) {
      return res.status(400).json({ success: false, message: "Category name and description are required." });
    }


    if(!categoryOffer){
        return res.status(404).json({success:false, message:"Category Offer required"})
    }

    categoryname = categoryname.trim().toLowerCase();

    const existingCategories = await Category.find({});

    for (const category of existingCategories) {
      const existingCategoryName = category.categoryname.toLowerCase();
      if (categoryname.includes(existingCategoryName) || existingCategoryName.includes(categoryname)) {
        return res.status(400).json({ success: false, message: "Category already exists." });
      }
    }

    let processedImage = [];
         
    if (req.files?.croppedImages) {
      const fileCount = req.files.croppedImages.length; 
      console.log(`Number of files uploaded: ${fileCount}`);
      
      processedImage = await uploadProductImages(req.files.croppedImages);
    } else {
        console.log("No files uploaded.");
        return res.status(404).json({success: false, message: "Image is required"})
    }

    const newCategory = new Category({
      categoryname,
      description,
      categoryOffer,
      categoryImage:processedImage
    });

    await newCategory.save();
    console.log(newCategory);
    return res.json({ success: true, message: "Category Added Successfully" });
  } catch (error) {
    console.error("Error Occurred", error);
    return res.status(500).json({ success: false, message: "Error Occurred" });
  }
};






const loadUpdateCategory =  async (req, res)=>{
    try {
       
        const { id } = req.params;

        const categoryData = await Category.findById(id); 
        res.render('categoryUpdate', { categoryData });
    } catch (error) {
        console.error("Error loading UpdateCategory page")
        res.json({success: false , message :"Error loading UpdateCategory page"})
    }
}


const updateCategory = async (req, res) => {
    try {
       
        const { id } = req.params;
        const { categoryname, description, categoryOffer } = req.body;

        // Process new image if uploaded
        let processedImage = [];
         
        if (req.files?.croppedImages) {
          const fileCount = req.files.croppedImages.length; 
          console.log(`Number of files uploaded: ${fileCount}`);
          
          processedImage = await uploadProductImages(req.files.croppedImages);
        } else {
            console.log("No files uploaded.");
        }


        // Fetch the existing category
        const existingCategory = await Category.findById(id);
        if (!existingCategory) {
            return res.status(404).json({ success: false, message: "Category not found" });
        }

        // Prepare update data
        const updateData = {
            categoryname: categoryname || existingCategory.categoryname,
            description: description || existingCategory.description,
            categoryOffer: categoryOffer || existingCategory.categoryOffer,
            categoryImage: processedImage.length?processedImage:existingCategory.categoryImage,
        };

        // Perform the update
        const updatedCategory = await Category.findByIdAndUpdate(id, updateData, { new: true });

        res.status(200).json({
            success: true,
            message: "Category successfully updated",
            updatedCategory,
        });
    } catch (error) {
        console.error("Error occurred during update:", error);
        res.status(500).json({
            success: false,
            message: "Error occurred during update",
        });
    }
};


module.exports={
    categorymanagement,
    loadaddcategory,
    addcategory,
    blocked_category,
    Unblocked_category,
    loadUpdateCategory,
    updateCategory,
}