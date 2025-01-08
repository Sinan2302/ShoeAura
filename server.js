// Load Environment Variables
const env = require('dotenv').config();

// Import Modules
const express = require('express');
const path = require("path");
const session = require('express-session');
const flash = require('connect-flash');
const nocache = require('nocache');
const connectDB = require('./config/db');
const userRouter = require('./routes/user');
const adminRouter = require('./routes/admin');
const userIsBanned = require('./middleware/isUserBanned')



// Initialize Express App
const app = express();

// Database Connection
connectDB();

// Middleware for Parsing Request Body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session Configuration
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 72 * 60 * 60 * 1000 // 72 hours
    }
}));


// Flash Messages
app.use(flash());
app.use((req, res, next) => {
    res.locals.messages = req.flash(); 
    next();
});

// Middleware for No-Cache
app.use(nocache());




// Static File Serving
app.use("/uploads", express.static("public/uploads"));
app.use(express.static(path.join(__dirname, "public")));

// Set View Engine and Views Directory
app.set("view engine", "ejs");
app.set("views", [path.join(__dirname, "views/admin"), path.join(__dirname, "views/user")]);

// Define Routes
app.use('/', userRouter);
app.use('/admin', adminRouter);

// Start the Server
app.listen(process.env.PORT, () => {
    console.log("Server is running on http://localhost:3000");
});
