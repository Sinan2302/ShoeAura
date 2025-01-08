const env = require('dotenv').config() 
const User = require("../../model/userSchema")
const bcrypt = require("bcrypt")
const nodemailer = require('nodemailer')
const Product = require('../../model/productSchema')
const Category = require('../../model/categorySchema')
const axios = require('axios');



const pageNotFound = async(req,res)=>{
    try {
        console.log('Session data:', req.session); 

        const isLogin = req.session.user ;
        res.render('error',{isLogin})
    } catch (error) {
        res.redirect('/pageNotFound')
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

        const isLogin = req.session.user ;

        const category = await Category.find({isBlocked:false,});

        const allowedCategoryIds = category.map(category => category._id);

        const products = await Product.find({isBlocked:false,category: { $in: allowedCategoryIds },productOffer:{$gt:22}}).limit(12);

        return res.render('home', { isLogin, products, category });
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

        req.session.user = {
            id: profile.id,
            name: profile.name,
            email: profile.email,
            picture: profile.picture, 
        };
        const isLogin = req.session.user


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



const signup = async (req, res) => {
    const { name, email, password, confirmpassword } = req.body;

    try {
        if (!name || !email || !password || !confirmpassword) {
            return res.status(400).send({ error: "All fields are required" });
        }

        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email)) {
            return res.status(400).send({ error: "Invalid email format" });
        }

        const FindUser = await User.findOne({ email });
        if (FindUser) {
            return res.status(400).send({ error: "User already exists with this email" });
        }

        if (password !== confirmpassword) {
            return res.status(400).send({ error: "Passwords do not match" });
        }

        if (password.length < 8) {
            return res.status(400).send({ error: "Password must be at least 8 characters long" });
        }
        
        const Otp = generateOtp();

        const emailSent = await sentVerificationOtp(email,Otp);
        if (!emailSent) {
            return res.send("email-error");
        }

        req.session.userOtp = Otp;
        req.session.userData = { name, email, password };

        console.log("OTP sent:", Otp); 

        res.status(201).render('verifyOtp');
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

const verifyOtp = async (req, res) => {
    try {
        const { Otp } = req.body;
        console.log("OTP from user:", Otp);  
        console.log("Stored OTP in session:", req.session.userOtp);  

        if (Otp === req.session.userOtp) {
            const user = req.session.userData;
            const passwordHash = await securePassword(user.password);

            const saveUserData = new User({
                name: user.name,
                email: user.email,
                password: passwordHash,
                ...(user.googleId && { googleId: user.googleId }),
            });
            
            await saveUserData.save();
            req.session.user = saveUserData;
            console.log("User verified and saved:", saveUserData);
            const isLogin = req.session.user;
            return res.json({ success: true, message: "OTP verified successfully!", isLogin });

        } else {
            console.error("OTP does not match");
            return res.render('verifyOtp', { error: "Invalid OTP, please try again" });
        }
    } catch (error) {
        console.error("Error verifying OTP", error);
        res.status(500).json({ success: false, message: "An error occurred" });
    }
};

const resendOtp = async (req, res) => {
    try {
        console.log("Resend OTP request initiated");
        const { email } = req.session.userData;
        
        if (!email) {
            console.error("Email not found in session");
            return res.status(400).json({ success: false, message: "Email not found in session" });
        }

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


const Shopping_page = async (req, res) => {
    try {
        const isLogin = req.session.user;
        const category = await Category.find({ isBlocked: false });

        const allowedCategoryIds = category.map(category => category._id);

        const page = parseInt(req.query.page) || 1;
        const itemsPerPage = 12; 

        const totalProducts = await Product.countDocuments({
            isBlocked: false,
            category: { $in: allowedCategoryIds },
        });

        // Fetch products for the current page
        const products = await Product.find({isBlocked: false,category: { $in: allowedCategoryIds },})
            .skip((page - 1) * itemsPerPage) 
            .limit(itemsPerPage); 

        const totalPages = Math.ceil(totalProducts / itemsPerPage);
        const breadcrumbs = [ 
            { name: 'Home', url: '/' },
            { name: 'Shopping Page', url: '/shopping_page' },
        ];
        res.render('Shopping_page', {
            products,
            isLogin,
            currentPage: page,
            totalPages,
            breadcrumbs
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
        const breadcrumbs = [ { name: 'Home', url: '/' },
            { name: 'Shopping Page', url: '/shopping_page' },
            { name: `Category ${category.categoryname}`, url: `/category_collection/${categoryId}` }, 
            { name: 'Product Details', url: `/product_details/${id}` } 
        ];
        // Render the product details page
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
            req.flash('error', 'Category is Unavailable , Try Some Another category');
            return res.redirect('/');
        }

        const page = parseInt(req.query.page) || 1;

        const totalProducts = await Product.countDocuments({ 
            category: categoryId, 
            isBlocked: false 
        });

        const products = await Product.find({ category: categoryId, isBlocked: false }).skip((page - 1) * 12) 
            .limit(12) 
            .populate('category');

        const totalPages = Math.ceil(totalProducts / 12);
        const breadcrumbs = [ { name: 'Home', url: '/' },
            { name: 'Shopping Page', url: '/shopping_page' },
            { name: `Category ${category.categoryname}`, url: `/category_collection/${categoryId}` }, 
        ];

        res.render('category_collection', {
            products,
            category,
            isLogin,
            currentPage: page,
            totalPages,
            breadcrumbs
        });
    } catch (error) {
        console.error('Error fetching products for category:', error.message);
        res.status(500).send('Something went wrong');
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
    loadHomepage,
    banpage,
    pageNotFound,
    loadSignup,
    googleSignin,
    callbackGoogle,
    loadLogin,
    signup,
    verifyOtp,
    resendOtp,
    login,
    Shopping_page,
    product_details,
    category_collection,
    logout
}
