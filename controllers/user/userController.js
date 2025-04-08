const env = require('dotenv').config() 
const User = require("../../model/userSchema")
const bcrypt = require("bcrypt")
const nodemailer = require('nodemailer')
const Product = require('../../model/productSchema')
const Category = require('../../model/categorySchema')
const axios = require('axios');
const Wishlist = require('../../model/wishlistSchema')
const crypto = require("crypto");
const mongoose = require('mongoose')


const applyBestOfferToProduct = async (product) => {
    try {
        if (!product.category || !product.category.categoryOffer) {
            const category = await mongoose.model("category").findById(product.category);
            product.category = category || {};
        }

        const productOffer = product.productOffer || 0;
        const categoryOffer = product.category.categoryOffer || 0;

        const bestOffer = Math.max(productOffer, categoryOffer);

        if (categoryOffer > productOffer) {
            await product.updateOne({ productOffer: categoryOffer });
        }

        const discountAmount = (bestOffer / 100) * product.price;
        const salePrice = Math.max(product.price - discountAmount, 0);

        if (product.SalePrice !== salePrice) {
            await product.updateOne({ SalePrice: Math.round(salePrice) });
        }

        if (bestOffer === categoryOffer && product.category._id) {
            await mongoose.model("category").updateOne(
                { _id: product.category._id },
                { categoryOffer: categoryOffer }
            );
        }

        return { ...product.toObject(), SalePrice: Math.round(salePrice) };
    } catch (error) {
        console.error("Failed to apply the best offer:", error);
        throw new Error("Failed to apply the best offer");
    }
};






const search = async (req, res) => {
  const query = req.query.query;
  const keywords = query.split(' ').map(keyword => new RegExp(keyword, 'i')); 

  try {
    const matchedCategories = await Category.find({ 
      categoryname: { $in: keywords } 
    });

    const categoryIds = matchedCategories.map(category => category._id);

    const products = await Product.find({
      $or: [
        { productname: { $in: keywords } }, 
        { category: { $in: categoryIds } }  
      ]
    }).populate('category'); 

    const isLogin = req.session.user;

    res.render('search', { products, isLogin, query });
  } catch (err) {
    console.error(err);
    res.status(500).send('An error occurred while searching for products.');
  }
}



const pageNotFound = async(req,res)=>{
    try {
        console.log('Session data:', req.session); 

        const isLogin = req.session.user ;
        res.render('error',{isLogin})
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}

const internalError = async(req,res)=>{
    try {
        console.log('session data:',req.session)
        const isLogin=req.session.user
        res.render('internalError',{isLogin})
    } catch (error) {
        console.error("Error occured During load internalError",error)
    }
}

const banpage = async(req,res)=>{
    try {
        console.log('Session data:', req.session); 

        const isLogin = req.session.user ;
        res.render('banpage',{isLogin})
    } catch (error) {
        console.error("Error occured During load banpage",error)
    }
}

const loadSignup = async(req,res)=>{
    try {
        if(!req.session.user){
            return res.render('signup')
        }
    } catch (error) {
        res.redirect('/')
    }
}

const loadLogin = async(req,res)=>{
    try {
        return res.render('userlogin')
    } catch (error) {
        res.redirect('/')
    }
}

const loadHomepage = async (req, res) => {
    try {
        console.log('Session data:', req.session);

        const isLogin = req.session.user;

        const categories = await Category.find({ isBlocked: false });

        const allowedCategoryIds = categories.map(category => category._id);

        const products = await Product.find({
            isBlocked: false,
            category: { $in: allowedCategoryIds },
        })
            .populate('category')
            .limit(8)
            ;

        const updatedProducts = await Promise.all(
            products.map((product) => applyBestOfferToProduct(product))
        );

        return res.render('home', { isLogin, products: updatedProducts, categories });
    } catch (error) {
        console.log("Home page is not found:", error.message);
        res.redirect('/pageNotFound');
    }
};





const googleSignin = async(req,res)=>{
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.CLIENT_ID}&redirect_uri=${process.env.REDIRECT_URI}&response_type=code&scope=profile email`;
    res.redirect(url);
}
const callbackGoogle = async (req, res) => {
    const { code } = req.query;

    try {
        const { data } = await axios.post('https://oauth2.googleapis.com/token', {
            client_id: process.env.CLIENT_ID,
            client_secret: process.env.CLIENT_SECRET,
            code,
            redirect_uri: process.env.REDIRECT_URI,
            grant_type: 'authorization_code',
        });

        const { access_token } = data;
        const { data: profile } = await axios.get('https://www.googleapis.com/oauth2/v1/userinfo', {
            headers: { Authorization: `Bearer ${access_token}` },
        });

        const user = await User.findOne({ googleId: profile.id });

        if (!user) {
            user = new User({
                googleId: profile.id,
                name: profile.name,
                email: profile.email,
                picture: profile.picture,
            });

            await user.save(); 
        } else {
            user.name = profile.name;
            user.picture = profile.picture;
            await user.save();
        }

        req.session.user = user
            

        res.redirect('/');
    } catch (error) {
        console.error('Error during Google OAuth:', error.message);
        return res.status(500).json({
            success: false,
            message: "Google Sign-In failed. Please try again.",
        });
    }
};



const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        if (!email || !password) {
            return res.status(400).json({ error: "All fields are required" });
        }

        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: "Invalid email format" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        const isPasswordMatch = await bcrypt.compare(password, user.password); 
        if (!isPasswordMatch) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        if (user.isBlocked) {
            return res.status(403).json({success: false,isBlocked: true,message: 'Your account has been banned.',});
        }
        
        req.session.user  = user
        const isLogin = req.session.user

        res.json({ success: true,message:"login successfully completed", isLogin});

    } catch (error) {
        console.error("Error during login:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

function generateOtp (){
    return Math.floor(100000 + Math.random()*900000).toString()
}

async function sentVerificationOtp(email,otp){
    try {
        const transporter = nodemailer.createTransport({
            service:"gmail",
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                user:process.env.NODEMAILER_EMAIL,
                pass:process.env.NODEMAILER_PASSWORD
            }
        })

        const info = await transporter.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: 'Verify your account',
            text: `Your OTP is ${otp}`,
            html: `<b>Your OTP: ${otp}</b>`,
        });
        return info.accepted.length>0

    } catch (error) {
        console.error("Error Sending email",error)
        return false;
    }
}



const generateReferralCode = () => {
    return Math.random().toString(36).substr(2, 6).toUpperCase();
};

const signup = async (req, res) => {
    const { name, email, password, confirmpassword, referralCode } = req.body;

    try {
        if (!name || !email || !password || !confirmpassword) {
            return res.status(400).send({ error: "All fields are required" });
        }

        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ success: false, message: "Invalid email format" });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "User already exists with this email" });
        }

        if (password !== confirmpassword) {
            return res.status(400).json({ success: false, message: "Passwords do not match" });
        }

        if (password.length < 8) {
            return res.status(400).json({ success: false, message: "Password must be at least 8 characters long" });
        }

        let validReferrer = null;
        if (referralCode) {
            validReferrer = await User.findOne({ referralCode });
            if (!validReferrer) {
                return res.status(400).json({ success: false, message: "Invalid referral code" });
            }
        }

        const newReferralCode = generateReferralCode();

        const Otp = generateOtp();
        const emailSent = await sentVerificationOtp(email, Otp);
        if (!emailSent) {
            return res.json({ success: false, message: "email-error" });
        }

        req.session.userOtp = Otp;
        req.session.userData = { name, email, password, referralCode: referralCode || newReferralCode };

        console.log("OTP sent:", Otp);
        res.status(201).json({ success: true, message: "Verify OTP" });

    } catch (error) {
        console.error("Server error", error);
        return res.status(500).send({ error: "Server Error" });
    }
};



const securePassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10);
        console.log("Password hash generated:", passwordHash);
        return passwordHash;
    } catch (error) {
        console.error("Error hashing password:", error.message);

        throw new Error("Password hashing failed. Please try again.");
    }
};




const getverifyOtp = async(req,res)=>{
    try {
        res.render('verifyOtp')
    } catch (error) {
        console.error('server error',error)
    }
}

const verifyOtp = async (req, res) => {
    try {
        const { Otp } = req.body;

        if (Otp !== req.session.userOtp) {
            return res.render('verifyOtp', { error: "Invalid OTP, please try again" });
        }

        const user = req.session.userData;
        const passwordHash = await securePassword(user.password);

        let referredByUser = null;
        if (user.referralCode) {
            referredByUser = await User.findOne({ referralCode: user.referralCode });
        }

        let newReferralCode;
        while (true) {
            newReferralCode = crypto.randomBytes(3).toString("hex").toUpperCase();
            const existingUser = await User.findOne({ referralCode: newReferralCode });
            if (!existingUser) break; 
        }

        const newUser = new User({
            name: user.name,
            email: user.email,
            password: passwordHash,
            referralCode: newReferralCode,
            referrerId: referredByUser ? referredByUser._id : null
        });

        if (referredByUser) {
            referredByUser.wallet.balance += 100;
            referredByUser.wallet.transactions.push({
                amount: 100,
                type: "credit",
                description: `Referral reward for inviting ${user.email}`
            });

            newUser.wallet.balance += 100;
            newUser.wallet.transactions.push({
                amount: 100,
                type: "credit",
                description: "Referral reward for signing up"
            });

            await referredByUser.save();
        }

        await newUser.save();
        req.session.user = newUser;

        console.log("User verified and saved:", newUser);
        return res.json({ success: true, message: "OTP verified successfully!", isLogin: req.session.user });

    } catch (error) {
        console.error("Error verifying OTP", error);
        res.status(500).json({ success: false, message: "An error occurred" });
    }
};




const resendOtp = async (req, res) => {
    try {
        console.log("Resend OTP request initiated");

        if (!req.session.userData || !req.session.userData.email) {
            console.error("Email not found in session");
            return res.status(400).json({ success: false, message: "Email not found in session" });
        }

        const { email } = req.session.userData;
        const Otp = generateOtp();
        console.log("Generated OTP:", Otp);

        req.session.userOtp = Otp;

        const emailSent = await sentVerificationOtp(email, Otp);
        console.log("OTP Resent:", Otp, "Email Sent:", emailSent);

        if (emailSent) {
            return res.status(200).json({ success: true, message: "OTP resent successfully" });
        } else {
            console.error("Failed to send email");
            return res.status(500).json({ success: false, message: "Failed to resend OTP, please try again" });
        }
    } catch (error) {
        console.error("Error resending OTP:", error);
        return res.status(500).json({ success: false, message: "Internal server error, please try again" });
    }
};


const emailverify = async(req,res)=>{
    try {
        res.render('forgot_password_Email')
    } catch (error) {
        console.error(error)
    }
}

const postEmailverify = async(req,res)=>{
    try {
        const {email} = req.body

        const FindEmail = await User.findOne({email})

        if(!FindEmail){
            res.json({success:false, message:"Email is not exist, try to SignUp"})
        }
        const Otp = generateOtp();

        const emailSent = await sentVerificationOtp(email,Otp);
        if (!emailSent) {
            return res.json({success:false, message:"email-error"});
        }

        req.session.userOtp = Otp;
        req.session.userData =  FindEmail ;
        console.log("userData:",req.session.userData)

        console.log("OTP sent:", Otp); 


        res.json({success:true, message:"Enter the Otp Sent to your Email"})
    } catch (error) {
        console.error(error)
    }
}
const getverifyOtp_forgotPassword = async(req,res)=>{
    try {
        res.render('veryfyOtp_password')
    } catch (error) {
        console.error("Server Error:",error)
        res.json({success:false, message:"Server Error Occured During Load"})
    }

}

const postverifyOtp_forgotPassword = async(req,res)=>{
    try {
        const {Otp} = req.body
        console.log("OTP from user:", Otp);  
        console.log("Stored OTP in session:", req.session.userOtp); 
        if (Otp === req.session.userOtp) {
           
            return res.json({ success: true, message: "OTP verified successfully!" });

        } else {
            console.error("OTP does not match");
            return res.json({success:false, message:"OTP does not match"});
        }
    } catch (error) {
        console.error(error)
    }
}

const new_password = async(req,res)=>{
    try {
        res.render('new_password')
    } catch (error) {
        console.error(error)
        res.json({succcess:false, message:"Server Error During Loading Page"})
    }
}

const post_new_password = async(req,res)=>{
    try {
        const {password, confirmpassword } = req.body
        if(password != confirmpassword){
            res.json({success:false, messsage:"Password is not match"})
        }
        const passwordHash = await securePassword(password);
        const {email} = req.session.userData

        const updatedUser = await User.findOneAndUpdate(
            { email: email }, 
            { password: passwordHash }, 
            { new: true } 
        );

        if(!updatedUser){
            return res.status(404).json({ success: false, message: "User not found" });
        }
        req.session.user = updatedUser
        const isLogin = req.session.user
        res.json({success:true, message:"Password Updated Successfully",isLogin})
    } catch (error) {
        console.error(error)
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
}

const Shopping_page = async (req, res) => {
    try {
        const isLogin = req.session.user;
        const categories = await Category.find({ isBlocked: false });

        const allowedCategoryIds = categories.map(category => category._id);

        const page = parseInt(req.query.page) || 1;
        const itemsPerPage = 12;
        const sortOption = req.query.sort || 'popularity';

        const priceRange = req.query.price ? req.query.price.split(",") : [];
        const brandFilter = req.query.brand ? req.query.brand.split(",") : [];
        const discountFilter = req.query.discount ? req.query.discount.split(",") : [];

        const brands = await Product.distinct("brand", { isBlocked: false });

        let sortCriteria;
        switch (sortOption) {
            case 'priceLowToHigh':
                sortCriteria = { SalePrice: 1 };
                break;
            case 'priceHighToLow':
                sortCriteria = { SalePrice: -1 };
                break;
            case 'averageRatings':
                sortCriteria = { averageRatings: -1 };
                break;
            case 'featured':
                sortCriteria = { featured: -1 };
                break;
            case 'newArrivals':
                sortCriteria = { createdAt: -1 };
                break;
            case 'nameAsc':
                sortCriteria = { productname: 1 };
                break;
            case 'nameDesc':
                sortCriteria = { productname: -1 };
                break;
            default:
                sortCriteria = { popularity: -1 };
                break;
        }

        let filterCriteria = { isBlocked: false, category: { $in: allowedCategoryIds } };

        if (priceRange.length > 0) {
            let priceConditions = priceRange.map(range => {
                if (range === 'above-2000') {
                    return { SalePrice: { $gt: 2000 } };
                } else {
                    const [min, max] = range.split('-').map(Number);
                    return { SalePrice: { $gte: min, $lte: max } };
                }
            });
            filterCriteria.$or = priceConditions;
        }

        if (brandFilter.length > 0) {
            filterCriteria.brand = { $in: brandFilter };
        }

        if (discountFilter.length > 0) {
            let discountConditions = discountFilter.map(discount => ({
                productOffer: { $gte: Number(discount) }
            }));
            filterCriteria.$or = filterCriteria.$or ? [...filterCriteria.$or, ...discountConditions] : discountConditions;
        }

        const totalProducts = await Product.countDocuments(filterCriteria);

        const products = await Product.find(filterCriteria)
            .sort(sortCriteria)
            .skip((page - 1) * itemsPerPage)
            .limit(itemsPerPage)
            .populate('category');

        const updatedProducts = await Promise.all(
            products.map(async (product) => {
                try {
                    return await applyBestOfferToProduct(product);
                } catch (offerError) {
                    console.error(`Failed to apply offer to product ${product._id}: ${offerError.message}`);
                    return product;
                }
            })
        );

        const totalPages = Math.ceil(totalProducts / itemsPerPage);

        const breadcrumbs = [
            { name: 'Home', url: '/' },
            { name: 'Shopping Page', url: '/shopping_page' },
        ];

        res.render('Shopping_page', {
            products: updatedProducts, 
            isLogin,
            currentPage: page,
            totalPages,
            breadcrumbs,
            categories,
            brands, 
            sortOption,
            priceRange, 
            brandFilter,
            discountFilter
        });
    } catch (error) {
        console.error("Error During Loading page:", error.message);
        res.status(500).send("An error occurred while loading the shopping page.");
    }
};




const product_details = async (req, res) => {
    try {
        const isLogin = req.session.user;
        const { id } = req.params;
        
        const categoryId = req.query.categoryId;
        
        const product = await Product.findOne({ _id: id, isBlocked: false }).populate('category');
        if (!product) {
            req.flash('error', 'Product is either blocked or does not exist');
            return res.redirect('/');
        }
        const category = product.category;
        const categories = await Category.find({ isBlocked: false });

        const relatedProducts = await Product.find({
            category: product.category,
            isBlocked: false,
            _id: { $ne: product._id },
        })
            .limit(12)
            .populate('category', { isBlocked: false });

        const productData = {
            ...product.toObject(),
            sizes: product.sizes instanceof Map ? Object.fromEntries(product.sizes) : product.sizes,
        };
        const breadcrumbs = [
            { name: 'Home', url: '/' },
            { name: 'Shopping Page', url: '/shopping_page' },
            { name: `Category ${category.categoryname}`, url: `/category_collection/${category._id}` },
            { name: 'Product Details', url: `/product_details/${id}` }
        ];
        

        res.render("product-detail", {
            product: productData,
            products: relatedProducts,
            categories,
            isLogin,
            breadcrumbs
        });
    } catch (error) {
        console.error("Error during loading the product details page:", error.message);
        req.flash('error', 'Something went wrong while loading the product details');
        res.redirect('/');
    }
};

const category_collection = async (req, res) => {
    try {
        const isLogin = req.session.user;
        const { categoryId } = req.params;

        const category = await Category.findOne({ _id: categoryId, isBlocked: false });
        if (!category) {
            req.flash("error", "Category is unavailable. Try another category.");
            return res.redirect("/");
        }

        const categories = await Category.find({ _id: { $ne: categoryId }, isBlocked: false });

        const page = parseInt(req.query.page) || 1;
        const sortOption = req.query.sort || "popularity";
        const priceRange = req.query.price ? req.query.price.split(",") : [];
        const brandFilter = req.query.brand ? req.query.brand.split(",") : [];
        const discountFilter = req.query.discount ? req.query.discount.split(",") : [];

        const sortOptions = {
            priceLowToHigh: { SalePrice: 1 },
            priceHighToLow: { SalePrice: -1 },
            averageRatings: { averageRatings: -1 },
            featured: { featured: -1 },
            newArrivals: { createdAt: -1 },
            nameAsc: { productname: 1 },
            nameDesc: { productname: -1 },
            popularity: { popularity: -1 },
        };

        const sortCriteria = sortOptions[sortOption] || { popularity: -1 };

        const priceFilters = {
            "100-500": { SalePrice: { $gte: 100, $lte: 500 } },
            "501-1000": { SalePrice: { $gte: 501, $lte: 1000 } },
            "1001-1500": { SalePrice: { $gte: 1001, $lte: 1500 } },
            "1501-2000": { SalePrice: { $gte: 1501, $lte: 2000 } },
            "above-2000": { SalePrice: { $gte: 2001 } },
        };

        const priceQuery = priceRange.length ? { $or: priceRange.map(range => priceFilters[range]) } : {};
        
        const brands = await Product.distinct("brand", { category: categoryId, isBlocked: false });
        const brandQuery = brandFilter.length ? { brand: { $in: brandFilter } } : {};

        const discountFilters = {
            "10": { productOffer: { $gte: 10 } },
            "20": { productOffer: { $gte: 20 } },
            "30": { productOffer: { $gte: 30 } },
            "40": { productOffer: { $gte: 40 } },
            "50": { productOffer: { $gte: 50 } },
            "above-60": { productOffer: { $gte: 60 } },
        };

        const discountQuery = discountFilter.length ? { $or: discountFilter.map(productOffer => discountFilters[productOffer]) } : {};

        const filterQuery = {
            category: categoryId,
            isBlocked: false,
            ...priceQuery,
            ...brandQuery,
            ...discountQuery,
        };

        const totalProducts = await Product.countDocuments(filterQuery);
        const products = await Product.find(filterQuery)
            .sort(sortCriteria)
            .skip((page - 1) * 12)
            .limit(12)
            .populate("category");

        const updatedProducts = await Promise.all(
            products.map(async (product) => {
                try {
                    return await applyBestOfferToProduct(product);
                } catch (offerError) {
                    console.error(`Failed to apply offer to product ${product._id}: ${offerError.message}`);
                    return product;
                }
            })
        );

        const totalPages = Math.ceil(totalProducts / 12);
        const breadcrumbs = [
            { name: "Home", url: "/" },
            { name: "Shopping Page", url: "/shopping_page" },
            { name: `Category ${category.categoryname}`, url: `/category_collection/${categoryId}` },
        ];

        res.render("category_collection", {
            products: updatedProducts, 
            category,
            isLogin,
            currentPage: page,
            totalPages,
            breadcrumbs,
            categories,
            sortOption,
            priceRange,
            brandFilter,
            discountFilter,
            brands,
        });
    } catch (error) {
        console.error(error);
        req.flash("error", "Something went wrong. Please try again later.");
        res.redirect("/");
    }
};






const logout = async (req, res) => {
    try {
        req.session.destroy((err) => {
            if (err) {
                console.error("Error destroying session", err);
                return res.status(500).send("Failed to logout");
            }
            res.clearCookie(process.env.SESSION_SECRET); 
            res.status(200).redirect('/'); 
            console.log("logout Successfull")
        });
    } catch (error) {
        console.error("Logout error:", error);
        res.status(500).send("Error occurred during logout");
    }
};



module.exports = {
    emailverify,
    postEmailverify,
    new_password,
    post_new_password,
    getverifyOtp_forgotPassword,
    postverifyOtp_forgotPassword,
    search,
    loadHomepage,
    banpage,
    internalError,
    pageNotFound,
    loadSignup,
    googleSignin,
    callbackGoogle,
    loadLogin,
    signup,
    verifyOtp,
    getverifyOtp,
    resendOtp,
    login,
    Shopping_page,
    product_details,
    category_collection,
    logout
}
