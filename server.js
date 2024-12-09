const express = require('express')
const app = express()
const path = require("path")
const env = require("dotenv").config()
const userRouter = require('./routes/user')
const connectDB = require('./config/db')
connectDB()


app.use(express.json())
app.use(express.urlencoded())

app.set("view engine","ejs")
app.set("views",[path.join(__dirname,"views/admin"),path.join(__dirname,"views/user")]);
app.use(express.static(path.join(__dirname, "public")));

app.use('/',userRouter)

app.listen(process.env.PORT,()=>{
    console.log("server is running");
})

