const env = require('dotenv').config();
const express = require('express');
const path = require("path");
const session = require('express-session');
const flash = require('connect-flash');
const nocache = require('nocache');
const connectDB = require('./config/db');
const userRouter = require('./routes/user');
const adminRouter = require('./routes/admin');
const wishlistMiddleware = require('./middleware/checkWishlist'); 


const app = express();

connectDB();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 72 * 60 * 60 * 1000
    }
}));
app.use(wishlistMiddleware); 

app.use(flash());
app.use((req, res, next) => {
    res.locals.messages = req.flash(); 
    next();
});

app.use(nocache());

app.use("/uploads", express.static("public/uploads"));
app.use(express.static(path.join(__dirname, "public")));



app.set("view engine", "ejs");
app.set("views", [path.join(__dirname, "views/admin"), path.join(__dirname, "views/user")]);

app.use('/', userRouter);
app.use('/admin', adminRouter);


app.use((req, res, next) => {
    const isLogin = req.session.user
    res.status(404).render('error', { message: 'Page Not Found' ,isLogin});
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('internalError', { message: 'Something went wrong! Please try again later.' });
});

app.listen(process.env.PORT, () => {
    console.log(`Server is running on http://localhost:${process.env.PORT}`);
});
