const mongoose = require('mongoose');
const fs = require('fs')
const path = require('path')
const admin = require("../../model/adminSchema")
const User = require("../../model/userSchema")
const Category = require('../../model/categorySchema')
const bcrypt = require('bcrypt');
const product = require('../../model/productSchema');



const product_management = async (req,res)=>{
    try {
        const isLogin = req.session.isAdminLoggedIn ? true : false;

        if (!isLogin) {
            return res.redirect('/admin/adminlogin'); 
        }

        const page = parseInt(req.query.page) || 1;
        const itemsPerPage = 10; 


        const totalProducts = await product.countDocuments();

        const products = await product.find().populate('category').skip((page - 1) * itemsPerPage) .limit(itemsPerPage);  
        const category = await Category.find({isBlocked:false})  

             

        const totalPages = Math.ceil(totalProducts / itemsPerPage);
      
        res.render('product_management',{products,category,isLogin,currentPage: page,totalPages,})
    } catch (error) {
        console.error("Error During Loading ");
    }
}

const loadaddproducts = async (req,res) =>{
    try {
        const isLogin = req.session.isAdminLoggedIn ? true : false;

        if (!isLogin) {
            return res.redirect('/admin/adminlogin'); 
        }
        res.render('addproduct',{isLogin})
    } catch (error) {
        console.error("Error During add products")
    }
}




const addproducts = async (req, res) => {
    try {
        const isLogin = req.session.isAdminLoggedIn ? true : false;

        if (!isLogin) {
            return res.redirect('/admin/adminlogin'); 
        }
        const { productname, description, category, brand, price, SalePrice, productOffer, colors,sizes } = req.body;

        if (!productname || !description || !category || !price ) {
            return res.status(400).json({ success: false, message: "Missing required fields." });
        }

        const FindProduct = await product.findOne({ productname });
        if (FindProduct) {
            return res.status(400).json({ status: false, message: "Product already exists" });
        }

        const FindCategory = await Category.findOne({ categoryname: category });
        if (!FindCategory) {
            return res.status(400).json({ success: false, message: "Category not Found" });
        }
        const processedSizes = sizes && typeof sizes === 'object' ? new Map(Object.entries(sizes)) : new Map();

        const productImages = req.files['productImages']
            ? req.files['productImages'].map((file) => file.filename)
            : [];
             
        const productData = new product({
            productname,
            description,
            category: FindCategory._id,  
            brand,
            price,
            SalePrice,
            productOffer,
            colors: Array.isArray(colors) ? colors : [colors],
            productImages,
            sizes: processedSizes,
            status:"Available"
        });

        console.log('Product Data Before Save:', productData);
        try {
            await productData.save();
            console.log('Product saved successfully:', productData);
            res.status(200).json({ success: true, message: "Product added successfully",isLogin });

        } catch (error) {
            console.error('Error during save:', error);
        }
        
    } catch (error) {
        console.error("Error During Adding Product:", error.message);
        res.status(500).json({ success: false, message: "Server error occurred.", error: error.message });
    }
};


const blocked_product = async (req, res) => {
    try {
        const isLogin = req.session.isAdminLoggedIn ? true : false;

        if (!isLogin) {
            return res.redirect('/admin/adminlogin'); 
        }
        const productData = req.params.productId;

        const productId = await product.findByIdAndUpdate(
            productData,
            { isBlocked: true },
            { new: true }
        );

        if (!productId) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        res.json({ success: true, message: 'Product blocked successfully', productId ,isLogin });
    } catch (error) {
        console.error('Error blocking product:', error.message);
        res.status(500).json({ success: false, message: 'An error occurred while blocking the product' });
    }
};

const unblocked_product = async (req, res) => {
    try {
        const isLogin = req.session.isAdminLoggedIn ? true : false;

        if (!isLogin) {
            return res.redirect('/admin/adminlogin'); 
        }
        const productData = req.params.productId;

        const productId = await product.findByIdAndUpdate(
            productData,
            { isBlocked: false },
            { new: true }
        );

        if (!productId) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        res.json({ success: true, message: 'Product unblocked successfully', productId ,isLogin });
    } catch (error) {
        console.error('Error unblocking product:', error.message);
        res.status(500).json({ success: false, message: 'An error occurred while unblocking the product' });
    }
};

const loadproductUpdate = async (req,res)=>{
    try {
        const isLogin = req.session.isAdminLoggedIn ? true : false;

        if (!isLogin) {
            return res.redirect('/admin/adminlogin'); 
        }
        const {id} = req.params
        const productData = await product.findById(id).populate('category').exec();  
        console.log(productData)
        res.render('productUpdate',{productData,isLogin})
    } catch (error) {
        console.error("Error during load the page");
        res.json({success : false , message:"Server Error Occured"})
    }
}

const productUpdate = async (req, res) => {
    try {
        const isLogin = req.session.isAdminLoggedIn ? true : false;

        if (!isLogin) {
            return res.redirect('/admin/adminlogin'); 
        }
        const { id } = req.params;
        const { productname, description, category, brand, price, SalePrice, productOffer, colors, imageIndex, sizes, isBlocked } = req.body;

        console.log('Form Data:', req.body);

        if (!productname || !description || !category || !price) {
            return res.status(400).json({ success: false, message: "Missing required fields." });
        }

        const FindCategory = await Category.findOne({ categoryname: category });
        if (!FindCategory) {
            return res.status(400).json({ success: false, message: "Category not found" });
        }

        const productData = await product.findById(id);
        if (!productData) {
            return res.status(404).json({ success: false, message: "Product not found." });
        }

        let updatedImages = [...productData.productImages];

        const parsedImageIndex = parseInt(imageIndex, 10);

       
        if (req.files && req.files.productImages) {
            req.files.productImages.forEach((file, index) => {
                const imgIndex = parseInt(imageIndex[index], 10); // Parse the index
                if (!isNaN(imgIndex) && imgIndex < updatedImages.length) {
                    updatedImages[imgIndex] = file.filename; // Update the specific image
                }
            });
        }

       
        

        const processedSizes = sizes && typeof sizes === 'object' ? new Map(Object.entries(sizes)) : new Map();
        const stockQuantity = Array.from(processedSizes.values()).reduce((acc, cur) => acc + cur, 0);
        const status = isBlocked || stockQuantity <= 0 ? "Out of Stock" : "Available";


        console.log("Parsed Image Index:", parsedImageIndex);
        console.log("Uploaded File:", req.files.productImages[0].filename);
        console.log("Updated Images Array:", updatedImages);
        
        const updatedProduct = await product.findByIdAndUpdate(
            id,
            {
                $set: {
                    productname,
                    description,
                    category: FindCategory._id,
                    brand,
                    price,
                    SalePrice,
                    productOffer,
                    stockQuantity,
                    colors: Array.isArray(colors) ? colors : colors ? [colors] : [],
                    productImages: updatedImages,
                    sizes: Object.fromEntries(processedSizes),
                    status,
                },
            },
            { new: true } // Return updated document
        );

        res.status(201).json({ success: true, message: "Product Updated successfully", productData: updatedProduct ,isLogin});
    } catch (error) {
        console.error("Error During Updating Product:", error.message);
        res.status(500).json({ success: false, message: "Server error occurred.", error: error.message });
    }
};




const productview = async (req, res) => {
    try {
        const isLogin = req.session.isAdminLoggedIn ? true : false;

        if (!isLogin) {
            return res.redirect('/admin/adminlogin'); 
        }
        const { id } = req.params;
        const products = await product.findById(id).populate('category');

        if (!products) {
            return res.json({ success: false, message: "Product not found" });
        }

        const productData = {
            ...products.toObject(),
            sizes: products.sizes instanceof Map ? Object.fromEntries(products.sizes) : products.sizes,
        };
        const stockQuantity = Object.values(productData.sizes || {}).reduce((acc, cur) => acc + cur, 0);
        const status = productData.isBlocked || stockQuantity === 0 ? 'Out of Stock' : 'Available';

        res.render('productview', { productData, stockQuantity, status, isLogin});
    } catch (error) {
        console.error("Error loading page:", error);
        res.redirect('/admin/product_management');
    }
};


module.exports = {
    product_management,
    loadaddproducts,
    addproducts,
    blocked_product,
    unblocked_product,
    loadproductUpdate,
    productUpdate,
    productview,
}