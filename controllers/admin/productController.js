const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const admin = require("../../model/adminSchema");
const User = require("../../model/userSchema");
const Category = require("../../model/categorySchema");
const bcrypt = require("bcrypt");
const product = require("../../model/productSchema");
const cloudinary = require('../../utils/cloudinary');
const uploadProductImages = require('../../utils/cloudinary')

const product_management = async (req, res) => {
    try {

        const page = parseInt(req.query.page) || 1;
        const itemsPerPage = 10;
        const searchQuery = req.query.search || '';

        const searchCriteria = searchQuery
            ? {
                  $or: [
                      { productname: { $regex: searchQuery, $options: 'i' } },
                      { 'category.categoryname': { $regex: searchQuery, $options: 'i' } },
                      { brand: { $regex: searchQuery, $options: 'i' } },
                  ],
              }
            : {};

        const totalProducts = await product.countDocuments(searchCriteria);

        const products = await product
            .find(searchCriteria)
            .populate("category")
            .sort({createdAt:-1})
            .skip((page - 1) * itemsPerPage)
            .limit(itemsPerPage);

        const category = await Category.find({ isBlocked: false });

        const totalPages = Math.ceil(totalProducts / itemsPerPage);

        res.render("product_management", {
            products,
            category,
            currentPage: page,
            totalPages,
            searchQuery,
        });
    } catch (error) {
        console.error("Error During Loading ", error);
        res.status(500).send("An error occurred while loading the product management page.");
    }
};



const loadaddproducts = async (req, res) => {
  try {

    const categoryData = await Category.find();
    
    res.render("addproduct", {  categoryData });
  } catch (error) {
    console.error("Error During add products");
  }
};


const addproducts = async (req, res) => {
  try {
   

    const { productname, description, category, brand, price, productOffer, colors, sizes } = req.body;


    if (!productname || !description || !category || !price   || !colors) {
      return res.status(400).json({ success: false, message: "Missing required fields." });
    }

    const existingProduct = await product.findOne({ productname });
    if (existingProduct) {
      return res.status(400).json({ success: false, message: "Product already exists." });
    }

    const categoryData = await Category.findById(category);
    if (!categoryData) {
      console.error(`Category not found: ${category}`);
      return res.status(400).json({ success: false, message: "Category not found." });
    }

    const SalePrice = Math.floor(price * (1 - productOffer / 100));
 
    const colorCap = colors.toUpperCase();
    const processedSizes = JSON.parse(sizes);


    const productImages = await uploadProductImages(req.files);



    const newProduct = new product({
      productname,
      description,
      category: categoryData._id,
      brand,
      price,
      SalePrice,
      productOffer,
      colors: colorCap,
      productImages,
      sizes: processedSizes,
      status: "Available"  // Default status is "Available"
    });

    console.log("New product Details",newProduct);

    await newProduct.save();

    return res.json({ success: true, message: "Product added successfully" });
  } catch (error) {
    console.error("Error occurred:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};




const blocked_product = async (req, res) => {
  try {
   
    const productData = req.params.productId;

    const productId = await product.findByIdAndUpdate(
      productData,
      { isBlocked: true },
      { new: true }
    );

    if (!productId) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    res.json({
      success: true,
      message: "Product blocked successfully",
      productId,
    });
  } catch (error) {
    console.error("Error blocking product:", error.message);
    res
      .status(500)
      .json({
        success: false,
        message: "An error occurred while blocking the product"
      });
  }
};

const unblocked_product = async (req, res) => {
  try {
   
    const productData = req.params.productId;

    const productId = await product.findByIdAndUpdate(
      productData,
      { isBlocked: false },
      { new: true }
    );

    if (!productId) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    res.json({
      success: true,
      message: "Product unblocked successfully",
      productId,
    });
  } catch (error) {
    console.error("Error unblocking product:", error.message);
    res
      .status(500)
      .json({
        success: false,
        message: "An error occurred while unblocking the product"
      });
  }
};

const loadproductUpdate = async (req, res) => {
  try {
    
    const { id } = req.params;
    const productData = await product.findById(id).populate("category").exec();
    const categoryData = await Category.find();

    const sizesObject = {};
    productData.sizes.forEach((quantity, size) => {
      sizesObject[size] = quantity;
    });

    console.log("product details",productData);
    res.render("productUpdate", { productData: { ...productData.toObject(), sizes: sizesObject } ,categoryData});
  } catch (error) {
    console.error("Error during load the page");
    res.json({ success: false, message: "Server Error Occured" });
  }
};

const productUpdate = async (req, res) => {
  try {
    
    const { id } = req.params;
    const { productname,description, category, brand, price, productOffer, colors, sizes, isBlocked } = req.body;


    if (!productname || !description || !category || !price) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields." });
    }

    const FindCategory = await Category.findById(category);
    if (!FindCategory) {
      console.error(`Category not found: ${category}`);
      return res.status(400).json({success: false,message: "Error: Product Adding Failed. The specified category was not found." });
    }

    const productData = await product.findById(id);
    if (!productData) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found." });
    }

   
    const SalePrice = Math.floor(price * (1 - productOffer / 100));

    const colorCap = colors.toUpperCase();

    let processedImage = [];
         
        if (req.files?.croppedImages) {
          const fileCount = req.files.croppedImages.length; 
          console.log(`Number of files uploaded: ${fileCount}`);
          
          processedImage = await uploadProductImages(req.files.croppedImages);
        } else {
            console.log("No files uploaded.");
        }

    
    const processedSizes = JSON.parse(sizes);

    const status =
      isBlocked || stockQuantity <= 0 ? "Out of Stock" : "Available";


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
          colors: colorCap,
          productImages: processedImage,
          sizes: processedSizes,
          status
        }
      },
      { new: true } 
    );

    res
      .status(201)
      .json({
        success: true,
        message: "Product Updated successfully",
        productData: updatedProduct,
      });
  } catch (error) {
    console.error("Error During Updating Product:", error.message);
    res
      .status(500)
      .json({
        success: false,
        message: "Server error occurred.",
        error: error.message
      });
  }
};

const productview = async (req, res) => {
  try {
    
    const { id } = req.params;
    const products = await product.findById(id).populate("category");

    if (!products) {
      return res.json({ success: false, message: "Product not found" });
    }

    const SalePrice = Math.floor(products.price * (1 - products.productOffer / 100));

    const productData = {
      ...products.toObject(),
      sizes:
        products.sizes instanceof Map
          ? Object.fromEntries(products.sizes)
          : products.sizes
    };
    const stockQuantity = productData.sizes|| {} 

  
    const status =
      productData.isBlocked || stockQuantity === 0
        ? "Out of Stock"
        : "Available";

    res.render("productview", { productData, stockQuantity, status ,SalePrice});
  } catch (error) {
    console.error("Error loading page:", error);
    res.redirect("/admin/product_management");
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
  productview
};
