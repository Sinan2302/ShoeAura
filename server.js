require('dotenv').config();
const express = require('express');
const path = require("path");
const session = require('express-session');
const flash = require('connect-flash');
const nocache = require('nocache');
const connectDB = require('./config/db');
const userRouter = require('./routes/user');
const adminRouter = require('./routes/admin');
const wishlistMiddleware = require('./middleware/checkWishlist'); 
const https = require('https');  // Importing https module
const fs = require('fs');  // Importing fs (file system) module

// Initialize the Express app
const app = express();

// Connect to your database
connectDB();

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session handling
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: true,
        httpOnly: true,
        maxAge: 72 * 60 * 60 * 1000
    }
}));
app.use(wishlistMiddleware);

// Flash messaging
app.use(flash());
app.use((req, res, next) => {
    res.locals.messages = req.flash(); 
    next();
});

// No-cache middleware
app.use(nocache());

// Static files setup
app.use("/uploads", express.static("public/uploads"));
app.use(express.static(path.join(__dirname, "public")));

// Set up EJS as the view engine
app.set("view engine", "ejs");
app.set("views", [path.join(__dirname, "views/admin"), path.join(__dirname, "views/user")]);

// Define routes
app.use('/', userRouter);
app.use('/admin', adminRouter);

// Handle 404 errors
app.use((req, res, next) => {
    const isLogin = req.session.user;
    res.status(404).render('error', { message: 'Page Not Found', isLogin });
});

// Handle server errors
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('internalError', { message: 'Something went wrong! Please try again later.' });
});

// SSL options for HTTPS
const sslServerOptions = process.env.NODE_ENV === 'production' ? {
    key: fs.readFileSync(path.join(__dirname, 'ssl', 'key.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'ssl', 'cert.pem')),
 } : {};
 

// Start the server using HTTPS
https.createServer(sslServerOptions, app).listen(process.env.PORT, () => {
    console.log(` Server running at https://localhost:${process.env.PORT}`);
});
